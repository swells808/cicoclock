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

  try {
    const { user_id, profile_id, company_id } = await req.json();

    // Support both user_id and profile_id for employees without auth accounts
    if ((!user_id && !profile_id) || !company_id) {
      return new Response(
        JSON.stringify({ error: 'user_id or profile_id and company_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query based on what identifier we have
    let query = supabase
      .from('time_entries')
      .select('*, projects(name)')
      .eq('company_id', company_id)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1);

    // Query by profile_id if provided, otherwise by user_id
    if (profile_id) {
      query = query.eq('profile_id', profile_id);
    } else {
      query = query.eq('user_id', user_id);
    }

    const { data: activeEntry, error } = await query.maybeSingle();

    if (error) {
      console.error('Error checking clock status:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to check clock status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Clock status check:', { 
      user_id, 
      profile_id, 
      company_id, 
      clocked_in: !!activeEntry,
      entry_id: activeEntry?.id 
    });

    return new Response(
      JSON.stringify({
        is_clocked_in: !!activeEntry,
        clocked_in: !!activeEntry,
        active_entry: activeEntry,
        time_entry: activeEntry
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-clock-status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
