import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ============================================================
// POST - Submit a review (customer rates worker after job)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { job_id, reviewer_id, reviewee_id, rating_value, comment, photos } = body;

    // Basic validation
    if (!job_id || !reviewer_id || !reviewee_id || !rating_value) {
      return NextResponse.json(
        { error: 'Missing required fields (job_id, reviewer_id, reviewee_id, rating_value)' },
        { status: 400 }
      );
    }

    // Validate rating is 1-5
    if (rating_value < 1 || rating_value > 5) {
      return NextResponse.json(
        { error: 'Rating value must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Insert review into database
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        job_id,
        reviewer_id,
        reviewee_id,
        rating_value,
        comment,
        photos,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating review:', error);
      return NextResponse.json(
        { error: 'Failed to create review', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, review: data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================
// GET - Get reviews for a specific worker or job
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewee_id = searchParams.get('reviewee_id');
    const job_id = searchParams.get('job_id');
    const limit = searchParams.get('limit') || '20';

    if (!reviewee_id && !job_id) {
      return NextResponse.json(
        { error: 'reviewee_id or job_id query parameter is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq(reviewee_id ? 'reviewee_id' : 'job_id', reviewee_id || job_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Supabase error fetching reviews:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, reviews: data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}