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

    const { 
      user_id, 
      profile_id, 
      task_id, 
      project_id, 
      company_id, 
      time_entry_id, 
      task_type_id, 
      action_type 
    } = await req.json();

    if (!user_id || !profile_id || !task_id || !company_id || !time_entry_id || !task_type_id || !action_type) {
      return new Response(
        JSON.stringify({ error: 'Required fields: user_id, profile_id, task_id, company_id, time_entry_id, task_type_id, action_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['start', 'finish'].includes(action_type)) {
      return new Response(
        JSON.stringify({ error: 'action_type must be start or finish' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve auto-other: look up the "Other" task type for this company
    let resolvedTaskId = task_id;
    let resolvedTaskTypeId = task_type_id;
    if (task_id === 'auto-other' || task_type_id === 'auto-other') {
      const { data: otherType } = await supabase
        .from('task_types')
        .select('id')
        .eq('company_id', company_id)
        .eq('is_active', true)
        .or('code.eq.8050,code.eq.OTH')
        .limit(1)
        .maybeSingle();

      if (!otherType) {
        // No "Other" task type configured — skip silently
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'No Other task type found' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      resolvedTaskId = otherType.id;
      resolvedTaskTypeId = otherType.id;
    }

    const { data, error } = await supabase
      .from('task_activities')
      .insert({
        user_id,
        profile_id,
        task_id: resolvedTaskId,
        project_id: project_id || null,
        company_id,
        time_entry_id,
        task_type_id: resolvedTaskTypeId,
        action_type,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording task activity:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, activity: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in record-task-activity:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
