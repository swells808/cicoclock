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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      company_name,
      industry,
      website,
      phone,
      street_address,
      city,
      state_province,
      postal_code,
      country
    } = await req.json();

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        company_name,
        industry,
        website,
        phone,
        street_address,
        city,
        state_province,
        postal_code,
        country
      })
      .select()
      .single();

    if (companyError) {
      console.error('Error creating company:', companyError);
      return new Response(
        JSON.stringify({ error: companyError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: featuresError } = await supabase
      .from('company_features')
      .insert({
        company_id: company.id,
        geolocation: true,
        employee_pin: false,
        photo_capture: true
      });

    if (featuresError) {
      console.error('Error creating company features:', featuresError);
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ company_id: company.id })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin'
      });

    if (roleError) {
      console.error('Error creating admin role:', roleError);
    }

    return new Response(
      JSON.stringify({ success: true, company }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-company:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
