import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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

    const { recipient_email, company_name, report_type, schedule_frequency } = await req.json();

    if (!recipient_email || !company_name) {
      return new Response(
        JSON.stringify({ error: 'recipient_email and company_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResponse = await resend.emails.send({
      from: 'CICO Reports <reports@resend.dev>',
      to: [recipient_email],
      subject: `You've been added to receive ${report_type} reports - ${company_name}`,
      html: `
        <h1>Welcome to CICO Reports</h1>
        <p>You have been added as a recipient for ${report_type} reports from ${company_name}.</p>
        <p>You will receive these reports ${schedule_frequency}.</p>
        <p>If you believe this was a mistake, please contact your administrator.</p>
      `,
    });

    console.log('Welcome email sent:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-recipient-welcome-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
