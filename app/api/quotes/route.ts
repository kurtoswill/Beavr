import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ============================================================
// POST - Submit a quote (specialist bids on a job)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { job_id, worker_id, proposed_rate, estimated_arrival } = body;

    // Basic validation
    if (!job_id || !worker_id || !proposed_rate) {
      return NextResponse.json(
        { error: 'Missing required fields (job_id, worker_id, proposed_rate)' },
        { status: 400 }
      );
    }

    // Insert quote into database
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        job_id,
        worker_id,
        proposed_rate,
        estimated_arrival,
        status: 'sent', 
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating quote:', error);
      return NextResponse.json(
        { error: 'Failed to create quote', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, quote: data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/quotes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// GET - Get all quotes for a specific job
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const job_id = searchParams.get('job_id');

    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id query parameter is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('job_id', job_id)
      .order('proposed_rate', { ascending: true });

    if (error) {
      console.error('Supabase error fetching quotes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quotes', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, quotes: data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/quotes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}