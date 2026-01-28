import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let recordId: string | null = null;

  try {
    const { time_entry_id, profile_id, company_id, clock_photo_url, profile_photo_url } = await req.json();

    if (!time_entry_id || !profile_id || !company_id) {
      return jsonResponse(
        { success: false, error: 'Missing required fields: time_entry_id, profile_id, company_id' },
        400
      );
    }

    // Step 1: Insert pending record
    const { data: record, error: insertError } = await supabase
      .from('face_verifications')
      .insert({
        time_entry_id,
        profile_id,
        company_id,
        clock_photo_url: clock_photo_url || null,
        profile_photo_url: profile_photo_url || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
    recordId = record.id;

    // Step 2: Check Azure secrets
    const endpoint = Deno.env.get('AZURE_FACE_ENDPOINT');
    const apiKey = Deno.env.get('AZURE_FACE_API_KEY');

    if (!endpoint || !apiKey) {
      await updateRecord(supabase, recordId, { status: 'error', error_message: 'Azure Face API not configured' });
      return jsonResponse({ success: true, status: 'error', message: 'Azure Face API not configured' });
    }

    // Step 3: Check photo URLs
    if (!clock_photo_url) {
      await updateRecord(supabase, recordId, { status: 'skipped', error_message: 'No clock photo' });
      return jsonResponse({ success: true, status: 'skipped' });
    }

    if (!profile_photo_url) {
      await updateRecord(supabase, recordId, { status: 'skipped', error_message: 'No profile photo' });
      return jsonResponse({ success: true, status: 'skipped' });
    }

    // Step 4: Resolve photo URLs (timeclock-photos is private, avatars is public)
    const fullClockPhotoUrl = clock_photo_url.startsWith('http')
      ? clock_photo_url
      : await getSignedUrl(supabase, 'timeclock-photos', clock_photo_url);
    const fullProfilePhotoUrl = profile_photo_url.startsWith('http')
      ? profile_photo_url
      : await getSignedUrl(supabase, 'avatars', profile_photo_url);

    if (!fullClockPhotoUrl) {
      await updateRecord(supabase, recordId, { status: 'error', error_message: 'Failed to generate signed URL for clock photo' });
      return jsonResponse({ success: true, status: 'error' });
    }
    if (!fullProfilePhotoUrl) {
      await updateRecord(supabase, recordId, { status: 'error', error_message: 'Failed to generate signed URL for profile photo' });
      return jsonResponse({ success: true, status: 'error' });
    }

    // Detect faces (binary mode)
    const clockFaceId = await detectFace(endpoint, apiKey, fullClockPhotoUrl);
    if (!clockFaceId) {
      await updateRecord(supabase, recordId, { status: 'no_face', error_message: 'No face detected in clock photo' });
      return jsonResponse({ success: true, status: 'no_face' });
    }

    const profileFaceId = await detectFace(endpoint, apiKey, fullProfilePhotoUrl);
    if (!profileFaceId) {
      await updateRecord(supabase, recordId, { status: 'no_face', error_message: 'No face detected in profile photo' });
      return jsonResponse({ success: true, status: 'no_face' });
    }

    // Step 5: Verify faces
    const result = await verifyFaces(endpoint, apiKey, clockFaceId, profileFaceId);

    await updateRecord(supabase, recordId, {
      status: 'verified',
      confidence_score: result.confidence,
      is_match: result.isIdentical,
      verified_at: new Date().toISOString(),
    });

    return jsonResponse({
      success: true,
      status: 'verified',
      confidence: result.confidence,
      is_match: result.isIdentical,
    });

  } catch (error) {
    console.error('verify-face error:', error);
    if (recordId) {
      await updateRecord(supabase, recordId, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Helper: generate a signed URL for a private storage bucket
async function getSignedUrl(supabase: any, bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
  if (error) {
    console.error(`Failed to sign ${bucket}/${path}:`, error.message);
    return null;
  }
  return data.signedUrl;
}

// Helper: update face_verifications record
async function updateRecord(supabase: any, id: string, fields: Record<string, any>) {
  await supabase.from('face_verifications').update(fields).eq('id', id);
}

// Helper: detect face in image, returns faceId or null
async function detectFace(endpoint: string, apiKey: string, imageUrl: string): Promise<string | null> {
  // Download image bytes
  const imgRes = await fetchWithTimeout(imageUrl, {}, 15000);
  if (!imgRes.ok) {
    throw new Error(`Failed to download image (${imgRes.status}): ${imageUrl}`);
  }
  const bytes = new Uint8Array(await imgRes.arrayBuffer());

  const detectUrl = `${endpoint}/face/v1.2/detect?detectionModel=detection_03&recognitionModel=recognition_04&returnFaceId=true&faceIdTimeToLive=120`;

  const res = await fetchWithTimeout(
    detectUrl,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: bytes,
    },
    25000
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Azure detect failed (${res.status}): ${errBody}`);
  }

  const faces = await res.json();
  return faces.length > 0 ? faces[0].faceId : null;
}

// Helper: verify two faces
async function verifyFaces(endpoint: string, apiKey: string, faceId1: string, faceId2: string) {
  const res = await fetchWithTimeout(
    `${endpoint}/face/v1.2/verify`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ faceId1, faceId2 }),
    },
    25000
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Azure verify failed (${res.status}): ${errBody}`);
  }

  return res.json(); // { isIdentical: boolean, confidence: number }
}

// Helper: fetch with AbortController timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper: JSON response with CORS headers
function jsonResponse(body: any, status = 200) {
  return new Response(
    JSON.stringify(body),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
