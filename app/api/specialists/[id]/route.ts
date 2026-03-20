import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
      .from("specialists")
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          email,
          phone
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Specialist not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch specialist", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, specialist: data },
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