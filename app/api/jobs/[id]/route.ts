/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

// ============================================================
// Validation Schema for Status Update (MATCHES DATABASE ENUM)
// ============================================================
const updateJobStatusSchema = z.object({
  status: z.enum(['pending', 'bid_accepted', 'on_the_way', 'working', 'completed']).optional(),
  specialist_id: z.string().uuid().nullable().optional(),
  reassign: z.boolean().optional(),
});

// ============================================================
// Type for update data
// ============================================================
interface JobUpdateData {
  status: 'pending' | 'bid_accepted' | 'on_the_way' | 'working' | 'completed';
  specialist_id?: string | null;
  accepted_at?: string;
  completed_at?: string;
}

// ============================================================
// GET - Get a single job by ID
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch job', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, job: data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/jobs/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH - Update job status
// ============================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    console.log('[PATCH /api/jobs] id:', id, 'body:', body);

    // Validate request body
    const validation = updateJobStatusSchema.safeParse(body);
    if (!validation.success) {
      console.error('[PATCH /api/jobs] Validation failed:', validation.error.issues);
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { status, specialist_id, reassign } = validation.data;

    // ── Reassign flow ─────────────────────────────────────────────────
    if (reassign) {
      const { data: jobData, error: jobFetchError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (jobFetchError || !jobData) {
        return NextResponse.json(
          { error: 'Job not found for reassign' },
          { status: 404 }
        );
      }

      const { profession, location_lat: customerLat, location_lng: customerLng, specialist_id: excludedSpecialist } = jobData;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let specialistsQuery = (supabase as any)
        .from('specialists')
        .select('*')
        .eq('profession', profession)
        .eq('is_online', true)
        .eq('is_verified', true);

      if (excludedSpecialist) {
        specialistsQuery = specialistsQuery.neq('id', excludedSpecialist);
      }

      const { data: specialists, error: specErr } = await specialistsQuery as {
        data: Array<{ id: string; location_lat: number | null; location_lng: number | null }> | null;
        error: { message: string } | null;
      };

      if (specErr) {
        console.error('[PATCH /api/jobs] Specialist lookup error during reassign:', specErr);
        return NextResponse.json(
          { error: 'Failed to fetch specialists', details: specErr.message },
          { status: 500 }
        );
      }

      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lng2 - lng1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      type SpecialistRow = { id: string; location_lat: number | null; location_lng: number | null };
      let nearest: SpecialistRow | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      const hasLocation = customerLat != null && customerLng != null;

      if (specialists && specialists.length > 0) {
        for (const spec of specialists) {
          if (!hasLocation || spec.location_lat == null || spec.location_lng == null) {
            if (!nearest) nearest = spec;
            continue;
          }
          const dist = getDistance(customerLat, customerLng, spec.location_lat, spec.location_lng);
          if (dist < nearestDistance) {
            nearestDistance = dist;
            nearest = spec;
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updatedJob, error: updateErr } = await (supabase as any)
        .from('jobs')
        .update({ status: 'pending', specialist_id: nearest ? nearest.id : null })
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        console.error('[PATCH /api/jobs] Failed to reassign job:', updateErr);
        return NextResponse.json(
          { error: 'Failed to reassign job', details: updateErr.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: true, job: updatedJob, matched_specialist: nearest },
        { status: 200 }
      );
    }

    // ── Normal status update flow ─────────────────────────────────────
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required for update' },
        { status: 400 }
      );
    }

    const updateData: JobUpdateData = { status };

    if (specialist_id !== undefined) {
      updateData.specialist_id = specialist_id ?? null;
      if (specialist_id) {
        updateData.accepted_at = new Date().toISOString();
        
        // ✅ Initialize worker_details when specialist accepts job
        const { data: specialist, error: specError } = await supabase
          .from('specialists')
          .select('user_id')
          .eq('id', specialist_id)
          .single() as { data: { user_id: string } | null; error: any };

        if (!specError && specialist?.user_id) {
          // Ensure worker_details record exists with initial 0 balance
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('worker_details')
            .upsert({
              id: specialist.user_id,
              wallet_balance: 0
            }, { onConflict: 'id' });
        }
      }
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    console.log('[PATCH /api/jobs] Writing to DB:', { id, updateData });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    console.log('[PATCH /api/jobs] DB result:', { data, error });

    if (error) {
      console.error('[PATCH /api/jobs] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to update job', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, job: data },
      { status: 200 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[PATCH /api/jobs] Unexpected error:', errorMsg);
    return NextResponse.json(
      { error: 'Internal server error', message: errorMsg },
      { status: 500 }
    );
  }
}