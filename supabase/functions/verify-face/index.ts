import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { time_entry_id, profile_id, company_id, clock_photo_url, profile_photo_url } = await req.json();

    console.log('Verify face request:', { time_entry_id, profile_id, company_id });

    // Validate required fields
    if (!time_entry_id || !profile_id || !company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: time_entry_id, profile_id, company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read Azure Face API configuration
    const endpoint = Deno.env.get('AZURE_FACE_ENDPOINT');
    const key = Deno.env.get('AZURE_FACE_API_KEY');

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Stub: Insert a pending record into face_verifications
    // Phase 2 will replace this with actual Azure Face API calls
    const { data, error } = await supabase
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

    if (error) {
      console.error('Face verification insert error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create verification record: ' + error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Face verification record created:', data.id);
    return new Response(
      JSON.stringify({ success: true, data, azure_configured: !!(endpoint && key) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify face error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
