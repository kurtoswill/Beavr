import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

// ============================================================
// Validation Schema for Status Update (MATCHES DATABASE ENUM)
// ============================================================
const updateJobStatusSchema = z.object({
  status: z.enum(['pending', 'bid_accepted', 'on_the_way', 'working', 'completed']),
  specialist_id: z.string().uuid().optional(),
});

// ============================================================
// Type for update data
// ============================================================
interface JobUpdateData {
  status: 'pending' | 'bid_accepted' | 'on_the_way' | 'working' | 'completed';
  specialist_id?: string;
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

    // Validate request body
    const validation = updateJobStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { status, specialist_id } = validation.data;

    // Build update object with proper type
    const updateData: JobUpdateData = { status };
    
    // Add specialist_id if provided (when job is accepted)
    if (specialist_id) {
      updateData.specialist_id = specialist_id;
      updateData.accepted_at = new Date().toISOString();
    }

    // Add completed_at if status is completed
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating job:', error);
      return NextResponse.json(
        { error: 'Failed to update job', details: error.message },
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
    console.error('Error in PATCH /api/jobs/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}