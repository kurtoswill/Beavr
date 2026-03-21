import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    // Fetch reviews for this specialist
    const { data, error } = await supabase
      .from("reviews")
      .select(
        `
        *,
        customers:user_id (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq("specialist_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Supabase error fetching reviews:", error);
      return NextResponse.json(
        { error: "Failed to fetch reviews", details: error.message },
        { status: 500 }
      );
    }

    // Transform reviews to match expected format
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
