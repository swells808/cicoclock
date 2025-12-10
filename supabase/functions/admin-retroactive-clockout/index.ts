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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user: callingUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: callingUser.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { time_entry_id, new_end_time, reason } = await req.json();

    if (!time_entry_id || !new_end_time) {
      return new Response(
        JSON.stringify({ error: 'time_entry_id and new_end_time are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: timeEntry, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', time_entry_id)
      .single();

    if (fetchError || !timeEntry) {
      return new Response(
        JSON.stringify({ error: 'Time entry not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = new Date(timeEntry.start_time);
    const endTime = new Date(new_end_time);
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    const { error: updateError } = await supabase
      .from('time_entries')
      .update({
        end_time: new_end_time,
        duration_minutes: durationMinutes
      })
      .eq('id', time_entry_id);

    if (updateError) {
      console.error('Error updating time entry:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: logError } = await supabase
      .from('admin_time_adjustments')
      .insert({
        admin_user_id: callingUser.id,
        affected_user_id: timeEntry.user_id,
        time_entry_id: time_entry_id,
        company_id: timeEntry.company_id,
        old_end_time: timeEntry.end_time,
        new_end_time: new_end_time,
        action_type: 'retroactive_clockout',
        reason
      });

    if (logError) {
      console.error('Error logging adjustment:', logError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-retroactive-clockout:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
