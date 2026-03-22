import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type ReviewRow = {
  id: string;
  rating: number | null;
  comment: string | null;
  photos: string[] | null;
  created_at: string;
  customers: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

// ============================================================
// GET - Get reviews for a specialist
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Specialist ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        customers:reviewer_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("reviewee_id", id)
      .order("created_at", { ascending: false })
      .limit(10) as { data: ReviewRow[] | null; error: { message: string } | null };

    if (error) {
      console.error("Supabase error fetching reviews:", error);
      return NextResponse.json(
        { error: "Failed to fetch reviews", details: error.message },
        { status: 500 }
      );
    }

    const reviews = (data || []).map((review) => ({
      id: review.id,
      name: review.customers?.full_name || "Anonymous",
      avatar: review.customers?.avatar_url || `https://i.pravatar.cc/80?img=${Math.floor(Math.random() * 70)}`,
      rating: review.rating || 0,
      text: review.comment || "",
      images: review.photos || [],
      created_at: review.created_at,
    }));

    return NextResponse.json(
      { success: true, reviews },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/specialists/[id]/reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}