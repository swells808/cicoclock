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

    const { time_entry_id, user_id, company_id } = await req.json();

    if (!time_entry_id || !user_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'time_entry_id, user_id, and company_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: openTasks, error: fetchError } = await supabase
      .from('task_activities')
      .select('*')
      .eq('time_entry_id', time_entry_id)
      .eq('user_id', user_id)
      .eq('action_type', 'start');

    if (fetchError) {
      console.error('Error fetching open tasks:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const closedTasks = [];
    for (const task of openTasks || []) {
      const { data: existingFinish } = await supabase
        .from('task_activities')
        .select('id')
        .eq('task_id', task.task_id)
        .eq('time_entry_id', time_entry_id)
        .eq('action_type', 'finish')
        .maybeSingle();

      if (!existingFinish) {
        const { error: insertError } = await supabase
          .from('task_activities')
          .insert({
            user_id: task.user_id,
            profile_id: task.profile_id,
            task_id: task.task_id,
            project_id: task.project_id,
            company_id: task.company_id,
            time_entry_id: task.time_entry_id,
            task_type_id: task.task_type_id,
            action_type: 'finish',
            timestamp: new Date().toISOString()
          });

        if (!insertError) {
          closedTasks.push(task.task_id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, closed_tasks: closedTasks }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in auto-close-tasks-on-shift-end:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
