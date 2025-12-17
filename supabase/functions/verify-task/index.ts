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

    const { task_id, company_id } = await req.json();

    if (!task_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'task_id and company_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up project_task with its project
    const { data: projectTask, error: taskError } = await supabase
      .from('project_tasks')
      .select('*, projects(id, name, company_id)')
      .eq('id', task_id)
      .single();

    if (taskError || !projectTask) {
      console.log('Project task not found:', task_id, taskError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Task not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify task belongs to the company
    const project = projectTask.projects as { id: string; name: string; company_id: string } | null;
    if (!project || project.company_id !== company_id) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Task does not belong to your company' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        task: {
          id: projectTask.id,
          name: projectTask.name,
          status: projectTask.status,
          assignee_id: projectTask.assignee_id,
          due_date: projectTask.due_date,
          project_id: project.id,
          project_name: project.name,
          company_id: project.company_id
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-task:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
