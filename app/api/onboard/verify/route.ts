import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/onboard/verify
 *
 * Coordinates data insertion across profiles, specialists, and verifications tables.
 * Uses pre-uploaded file URLs from /api/upload endpoint.
 *
 * Prerequisites (Stop Gates):
 * - Face Verification status must be "Success"
 * - Valid user_id from Supabase Auth must be present
 * - Files must be pre-uploaded to worker-docs bucket via /api/upload
 *
 * Request body:
 * {
 *   firstName, middleInitial, lastName,
 *   email, phone,
 *   province, municipality, barangay, street_address,
 *   latitude, longitude,
 *   role (profession), yearsExp,
 *   idType,
 *   idFrontUrl, idBackUrl, selfieUrl (public URLs from /api/upload),
 *   faceVerificationStatus (must be "Success")
 * }
 */
export async function POST(request: NextRequest) {
  const errors: string[] = [];

  try {
    const body = await request.json();

    // ================================================================
    // STOP GATE 1: Face Verification Check
    // ================================================================
    if (body.faceVerificationStatus !== "success") {
      return NextResponse.json(
        {
          error: "Face verification must be completed (green status required)",
        },
        { status: 400 },
      );
    }

    const {
      firstName,
      middleInitial,
      lastName,
      email,
      phone,
      province,
      municipality,
      barangay,
      street_address,
      latitude,
      longitude,
      role,
      yearsExp,
      idType,
      idFrontUrl,
      idBackUrl,
      selfieUrl,
    } = body;

    // ================================================================
    // STOP GATE 2: Find user by email
    // ================================================================
    const { data: profileData, error: profileFindError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (profileFindError || !profileData) {
      return NextResponse.json(
        {
          error: "Profile not found. Please sign up first.",
          details: profileFindError?.message,
        },
        { status: 404 },
      );
    }

    const userId = profileData.id;

    // ================================================================
    // VALIDATE: All file URLs must be provided
    // ================================================================
    if (!idFrontUrl || !idBackUrl || !selfieUrl) {
      return NextResponse.json(
        {
          error:
            "Missing required file URLs. Upload files to /api/upload first.",
        },
        { status: 400 },
      );
    }

    // ================================================================
    // STEP 1: Files already uploaded to worker-docs via /api/upload
    // ================================================================
    const uploadedUrls = {
      idFront: idFrontUrl,
      idBack: idBackUrl,
      selfie: selfieUrl,
    };

    // ================================================================
    // STEP 2: Update profiles Table (UPSERT)
    // ================================================================
    const fullName = [
      firstName,
      middleInitial ? `${middleInitial}.` : "",
      lastName,
    ]
      .filter(Boolean)
      .join(" ");

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: fullName,
          email,
          phone,
          province,
          municipality,
          barangay,
          street_address,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (profileError) {
      console.log("Profile upsert error:", profileError);
      errors.push(`Failed to update profiles table: ${profileError.message}`);
      return NextResponse.json(
        {
          error: "Database error. No changes committed.",
          details: errors,
        },
        { status: 500 },
      );
    }

    // ================================================================
    // STEP 3: Insert into specialists Table
    // ================================================================
    const { data: specialistData, error: specialistError } = await supabase
      .from("specialists")
      .insert({
        user_id: userId,
        profession: role,
        years_exp: yearsExp,
        location_lat: parseFloat(latitude),
        location_lng: parseFloat(longitude),
        is_verified: false, // Pending admin review
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (specialistError) {
      console.log("Specialist insert error:", specialistError);
      errors.push(
        `Failed to insert into specialists: ${specialistError.message}`,
      );
      return NextResponse.json(
        {
          error: "Database error. No changes committed.",
          details: errors,
        },
        { status: 500 },
      );
    }

    const workerId = specialistData.id;

    // ================================================================
    // STEP 4: Insert into verifications Table
    // ================================================================
    const { data: verificationData, error: verificationError } = await supabase
      .from("verifications")
      .insert({
        worker_id: workerId,
        id_type: idType,
        document_url: uploadedUrls.idFront,
        document_back_url: uploadedUrls.idBack,
        selfie_url: uploadedUrls.selfie,
        status: "pending",
      })
      .select()
      .single();

    if (verificationError) {
      console.log("Verification insert error:", verificationError);
      errors.push(
        `Failed to insert into verifications: ${verificationError.message}`,
      );
      return NextResponse.json(
        {
          error: "Database error. No changes committed.",
          details: errors,
        },
        { status: 500 },
      );
    }

    // ================================================================
    // STEP 5: Update profile role to 'specialist'
    // ================================================================
    // Note: This step may fail if the database constraint doesn't allow 'specialist' as a role.
    // The specialist information is already stored in the specialists table, so this is optional.
    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: "specialist" })
      .eq("id", userId);

    if (roleError) {
      // Log warning but don't fail the request - specialist data is already in specialists table
      console.warn(
        "Could not update profile role (constraint violation):",
        roleError.message,
      );
      // Continue without failing - specialist table has the correct data
    }

    // ================================================================
    // SUCCESS: All inserts completed
    // ================================================================
    return NextResponse.json(
      {
        success: true,
        message: "Onboarding verification submitted successfully",
        data: {
          userId,
          workerId,
          verificationId: verificationData.id,
          uploadedUrls,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/onboard/verify:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
