import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// POST - Upload file to Supabase Storage
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string || 'job-images';

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type (images only based on bucket config)
    const allowedTypes = ['image/'];
    const isAllowedType = allowedTypes.some((type) =>
      file.type.startsWith(type)
    );

    if (!isAllowedType) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB based on bucket config)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    // Validate bucket name (only allow known buckets)
    const allowedBuckets = ['job-images', 'avatars', 'worker-docs'];
    const safeBucket = allowedBuckets.includes(bucket) ? bucket : 'job-images';

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(safeBucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file', details: error.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(safeBucket)
      .getPublicUrl(fileName);

    return NextResponse.json(
      { 
        success: true, 
        url: urlData.publicUrl,
        path: data.path,
        bucket: safeBucket,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}