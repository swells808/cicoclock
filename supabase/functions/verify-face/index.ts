import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * This edge function is now a NO-OP.
 * 
 * Face verification has been migrated to client-side using face-api.js.
 * The Timeclock page handles verification directly in the browser.
 * 
 * This function exists only for backward compatibility with any database webhooks
 * that may still be triggering it. It logs a skip status and returns immediately.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { time_entry_id, profile_id, company_id, clock_photo_url, profile_photo_url } = await req.json();

    console.log('[verify-face] Received request - client-side verification is now active');

    if (!time_entry_id || !profile_id || !company_id) {
      return jsonResponse(
        { success: false, error: 'Missing required fields: time_entry_id, profile_id, company_id' },
        400
      );
    }

    // Check if client-side verification already logged a result for this time entry
    const { data: existingVerification } = await supabase
      .from('face_verifications')
      .select('id, status, match_distance')
      .eq('time_entry_id', time_entry_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingVerification && existingVerification.match_distance !== null) {
      // Client-side verification already ran - don't duplicate
      console.log('[verify-face] Client-side verification already exists, skipping server-side');
      return jsonResponse({
        success: true,
        status: existingVerification.status,
        message: 'Client-side verification already recorded',
      });
    }

    // If we get here, client-side verification didn't run (maybe old app version)
    // Log as skipped since we no longer have Azure credentials
    const { error: insertError } = await supabase
      .from('face_verifications')
      .insert({
        time_entry_id,
        profile_id,
        company_id,
        clock_photo_url: clock_photo_url || null,
        profile_photo_url: profile_photo_url || null,
        status: 'skipped',
        match_reason: 'server_side_deprecated',
        error_message: 'Server-side verification deprecated. Please update to latest app version for client-side face verification.',
        verification_version: 'faceapi-v1',
      });

    if (insertError) {
      console.error('[verify-face] Insert error:', insertError);
    }

    console.log('[verify-face] Logged skip status - server-side verification is deprecated');

    return jsonResponse({
      success: true,
      status: 'skipped',
      message: 'Server-side face verification has been deprecated. Use client-side verification.',
    });

  } catch (error) {
    console.error('[verify-face] Error:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

function jsonResponse(body: any, status = 200) {
  return new Response(
    JSON.stringify(body),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}