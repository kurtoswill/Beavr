/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ============================================================
// GET - Get a single specialist by ID with profile data
// Accepts either specialists.id OR user_id — tries both.
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

    const selectFields = `
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
    `;

    type SpecialistRow = {
      id: string;
      user_id: string;
      profession: string | null;
      rating_avg: number | null;
      total_reviews: number | null;
      jobs_completed: number | null;
      location_lat: number | null;
      location_lng: number | null;
      rate: number | null;
      min_rate: number | null;
      is_online: boolean | null;
      is_verified: boolean | null;
      profiles: {
        full_name: string | null;
        avatar_url: string | null;
        email: string | null;
        phone: string | null;
        province: string | null;
        municipality: string | null;
      } | null;
    };

    // First: try looking up by specialists table row id (specialists.id)
    let { data, error } = await supabase
      .from("specialists")
      .select(selectFields)
      .eq("id", id)
      .maybeSingle() as { data: SpecialistRow | null; error: { message: string } | null };

    // Second: if not found, try looking up by user_id (auth uuid)
    if (!data) {
      const result = await supabase
        .from("specialists")
        .select(selectFields)
        .eq("user_id", id)
        .maybeSingle() as { data: SpecialistRow | null; error: { message: string } | null };

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Supabase error fetching specialist:", error);
      return NextResponse.json(
        { error: "Failed to fetch specialist", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404 }
      );
    }

    // Fetch wallet balance from worker_details
    const { data: walletData } = await supabase
      .from("worker_details")
      .select("wallet_balance")
      .eq("id", data.user_id)
      .maybeSingle() as { data: { wallet_balance: number } | null; error: any };

    // Merge specialist data with profile data
    const specialist = {
      id: data.id,
      user_id: data.user_id,
      full_name: data.profiles?.full_name || null,
      email: data.profiles?.email || null,
      avatar_url: data.profiles?.avatar_url || null,
      phone: data.profiles?.phone || null,
      role: data.profession || null,
      province: data.profiles?.province || null,
      municipality: data.profiles?.municipality || null,
      location_lat: data.location_lat || null,
      location_lng: data.location_lng || null,
      rating: data.rating_avg || null,
      reviews_count: data.total_reviews || 0,
      jobs_completed: data.jobs_completed || 0,
      rate: data.rate || null,
      min_rate: data.min_rate || null,
      is_online: data.is_online || false,
      is_verified: data.is_verified || false,
      wallet_balance: walletData?.wallet_balance || 0,
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