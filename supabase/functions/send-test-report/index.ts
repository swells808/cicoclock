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

    const { scheduled_report_id, recipient_email } = await req.json();

    if (!scheduled_report_id || !recipient_email) {
      return new Response(
        JSON.stringify({ error: 'scheduled_report_id and recipient_email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: report, error: reportError } = await supabase
      .from('scheduled_reports')
      .select('*, companies(company_name)')
      .eq('id', scheduled_report_id)
      .single();

    if (reportError || !report) {
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResponse = await resend.emails.send({
      from: 'CICO Reports <reports@resend.dev>',
      to: [recipient_email],
      subject: `[TEST] ${report.report_type} Report - ${report.companies?.company_name}`,
      html: `
        <h1>Test Report</h1>
        <p>This is a test email for your scheduled ${report.report_type} report.</p>
        <p>Report Configuration:</p>
        <ul>
          <li>Frequency: ${report.schedule_frequency}</li>
          <li>Time: ${report.schedule_time}</li>
        </ul>
        <p>If you received this email, your report is configured correctly.</p>
      `,
    });

    console.log('Test email sent:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, email_response: emailResponse }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-test-report:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
