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
    const { company_id, identifier } = await req.json();

    if (!company_id || !identifier) {
      return new Response(
        JSON.stringify({ error: 'company_id and identifier are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[lookup-employee] Looking up employee with identifier:', identifier, 'in company:', company_id);

    const { data, error } = await supabase.rpc('lookup_employee_by_identifier', {
      _company_id: company_id,
      _identifier: identifier.trim()
    });

    if (error) {
      console.error('[lookup-employee] Lookup error:', error);
      return new Response(
        JSON.stringify({ error: 'Lookup failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data || data.length === 0) {
      console.log('[lookup-employee] No employee found');
      return new Response(
        JSON.stringify({ found: false, error: 'Employee not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const employee = data[0];
    console.log('[lookup-employee] Found employee:', employee.display_name);

    return new Response(
      JSON.stringify({ 
        found: true, 
        employee: {
          id: employee.profile_id,
          user_id: employee.user_id,
          display_name: employee.display_name,
          first_name: employee.first_name,
          last_name: employee.last_name,
          has_pin: employee.has_pin
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[lookup-employee] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
