import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ============================================================
// POST - Create a new job
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      customer_id,
      profession,
      description,
      street_address,
      province,
      municipality,
      barangay,
      landmarks,
      location_lat,
      location_lng,
      photos,
      category_id,
    } = body;

    // Basic validation
    if (!customer_id || !profession || !description || !street_address) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert job into database
    const { data: jobData, error } = await (supabase.from('jobs') as any)
      .insert({
        customer_id,
        profession,
        description,
        street_address,
        province,
        municipality,
        barangay,
        landmarks,
        location_lat,
        location_lng,
        photos,
        category_id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating job:', error);
      return NextResponse.json(
        { error: 'Failed to create job', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, job: jobData },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// GET - Get all jobs (for specialists to browse)
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const profession = searchParams.get('profession');
    const limit = searchParams.get('limit') || '20';

    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    const specialistId = searchParams.get('specialist_id');

    if (status) {
      query = query.eq('status', status);
    }

    if (profession) {
      query = query.eq('profession', profession);
    }

    if (specialistId) {
      query = query.eq('specialist_id', specialistId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, jobs: data }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/jobs:', error);  // ✅ Log the error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}