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

    const { profile_id, company_id } = await req.json();

    if (!profile_id || !company_id) {
      return new Response(
        JSON.stringify({ error: 'profile_id and company_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, departments(name)')
      .eq('id', profile_id)
      .eq('company_id', company_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Employee not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.status !== 'active') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Employee is not active' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: company } = await supabase
      .from('companies')
      .select('company_name')
      .eq('id', company_id)
      .single();

    return new Response(
      JSON.stringify({
        valid: true,
        employee: {
          name: profile.display_name || `${profile.first_name} ${profile.last_name}`,
          employee_id: profile.employee_id,
          department: profile.departments?.name,
          status: profile.status
        },
        company: company?.company_name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-badge:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
