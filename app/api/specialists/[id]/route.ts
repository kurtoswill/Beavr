import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ============================================================
// GET - Get a single specialist by ID with profile data
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

    // Fetch specialist with profile data
    const { data, error } = await supabase
      .from("specialists")
      .select(
        `
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email,
          phone,
          province,
          municipality
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Specialist not found" },
          { status: 404 }
        );
      }
      console.error("Supabase error fetching specialist:", error);
      return NextResponse.json(
        { error: "Failed to fetch specialist", details: error.message },
        { status: 500 }
      );
    }

    // Merge specialist data with profile data
    const specialist = {
      id: data.id,
      full_name: data.profiles?.full_name || null,
      email: data.profiles?.email || null,
      avatar_url: data.profiles?.avatar_url || null,
      phone: data.profiles?.phone || null,
      role: data.profiles?.role || "specialist",
      province: data.profiles?.province || null,
      municipality: data.profiles?.municipality || null,
      rating: data.rating_avg || null,
      reviews_count: data.total_reviews || 0,
      jobs_completed: data.jobs_completed || 0,
      rate: data.rate || null,
      is_online: data.is_online || false,
      is_verified: data.is_verified || false,
    };

    return NextResponse.json(
      { success: true, specialist },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/specialists/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
