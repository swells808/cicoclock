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

    const body = await req.json();
    // Accept either parameter name for flexibility
    const actualProfileId = body.profile_id || body.profileId;
    let actualCompanyId = body.company_id;

    if (!actualProfileId) {
      return new Response(
        JSON.stringify({ error: 'profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GENERATE_BADGE] Fetching profile:', actualProfileId);

    // Fetch the profile with department
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, first_name, last_name, avatar_url, employee_id, company_id, department_id, departments(name)')
      .eq('id', actualProfileId)
      .single();

    if (profileError || !profile) {
      console.error('[GENERATE_BADGE] Profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use profile's company_id if not provided
    actualCompanyId = actualCompanyId || profile.company_id;

    if (!actualCompanyId) {
      return new Response(
        JSON.stringify({ error: 'Company not found for this profile' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GENERATE_BADGE] Fetching company:', actualCompanyId);

    // Fetch company info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, company_name, company_logo_url, website, phone')
      .eq('id', actualCompanyId)
      .single();

    if (companyError || !company) {
      console.error('[GENERATE_BADGE] Company not found:', companyError);
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch certifications for the profile
    console.log('[GENERATE_BADGE] Fetching certifications');
    const { data: certifications, error: certError } = await supabase
      .from('user_certifications')
      .select('id, cert_name, cert_code, cert_number, certifier_name, issue_date, expiry_date, status')
      .eq('profile_id', actualProfileId)
      .order('issue_date', { ascending: false });

    if (certError) {
      console.error('[GENERATE_BADGE] Error fetching certifications:', certError);
    }

    // Fetch badge template if exists
    const { data: template } = await supabase
      .from('badge_templates')
      .select('*')
      .eq('company_id', actualCompanyId)
      .eq('is_active', true)
      .single();

    // Build the response profile object matching what PublicBadge expects
    const dept = profile.departments as unknown as { name: string } | null;
    const responseProfile = {
      id: profile.id,
      display_name: profile.display_name,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
      employee_id: profile.employee_id,
      department: dept ? { name: dept.name } : null,
      company: {
        id: company.id,
        company_name: company.company_name,
        company_logo_url: company.company_logo_url,
        website: company.website,
        phone: company.phone
      }
    };

    console.log('[GENERATE_BADGE] Success - returning data');

    return new Response(
      JSON.stringify({ 
        success: true, 
        profile: responseProfile,
        certifications: certifications || [],
        badgeTemplate: template?.template_config || null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-badge:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
