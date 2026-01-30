import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_SHIFT_HOURS = 12;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    console.log('Starting auto-close overtime shifts check...');

    // Calculate the cutoff time (12 hours ago)
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (MAX_SHIFT_HOURS * 60 * 60 * 1000));
    
    // Set end time to 11:59:59 PM of the current day
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Find all open time entries that started more than 12 hours ago
    const { data: overtimeEntries, error: fetchError } = await supabase
      .from('time_entries')
      .select(`
        id,
        start_time,
        company_id,
        profile_id,
        user_id,
        project_id,
        profiles!time_entries_profile_id_fkey(
          id,
          first_name,
          last_name,
          display_name,
          employee_id
        ),
        projects(name)
      `)
      .is('end_time', null)
      .lt('start_time', cutoffTime.toISOString());

    if (fetchError) {
      console.error('Error fetching overtime entries:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${overtimeEntries?.length || 0} overtime entries to close`);

    if (!overtimeEntries || overtimeEntries.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No overtime entries to close', closed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group entries by company for admin notifications
    const entriesByCompany: Record<string, typeof overtimeEntries> = {};
    
    for (const entry of overtimeEntries) {
      if (!entriesByCompany[entry.company_id]) {
        entriesByCompany[entry.company_id] = [];
      }
      entriesByCompany[entry.company_id].push(entry);
    }

    const closedEntries: string[] = [];
    const emailsSent: string[] = [];

    // Process each company's entries
    for (const [companyId, entries] of Object.entries(entriesByCompany)) {
      // Close all overtime entries for this company
      for (const entry of entries) {
        const startTime = new Date(entry.start_time);
        const durationMinutes = Math.floor((endOfDay.getTime() - startTime.getTime()) / 60000);

        const { error: updateError } = await supabase
          .from('time_entries')
          .update({
            end_time: endOfDay.toISOString(),
            duration_minutes: durationMinutes,
            description: `[Auto-closed: Shift exceeded ${MAX_SHIFT_HOURS} hours]`
          })
          .eq('id', entry.id);

        if (updateError) {
          console.error(`Failed to close entry ${entry.id}:`, updateError);
        } else {
          closedEntries.push(entry.id);
          console.log(`Closed entry ${entry.id} with duration ${durationMinutes} minutes`);
        }
      }

      // Get company info and admin emails
      const { data: company } = await supabase
        .from('companies')
        .select('company_name, timezone')
        .eq('id', companyId)
        .single();

      // Get admin user emails for this company
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          user_id
        `)
        .eq('company_id', companyId)
        .not('email', 'is', null);

      // Filter to only admins
      const adminEmails: string[] = [];
      if (adminProfiles) {
        for (const profile of adminProfiles) {
          if (profile.user_id) {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.user_id)
              .eq('role', 'admin')
              .maybeSingle();
            
            if (roleData && profile.email) {
              adminEmails.push(profile.email);
            }
          }
        }
      }

      console.log(`Found ${adminEmails.length} admin emails for company ${companyId}`);

      // Send email notification to admins
      if (resend && adminEmails.length > 0) {
        const companyName = company?.company_name || 'Your Company';
        const timezone = company?.timezone || 'America/Los_Angeles';
        
        // Build the employee list HTML
        const employeeListHtml = entries.map(entry => {
          const profile = entry.profiles as any;
          const employeeName = profile?.display_name || 
            `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 
            'Unknown Employee';
          const employeeId = profile?.employee_id || 'N/A';
          const projectName = (entry.projects as any)?.name || 'No Project';
          const startTime = new Date(entry.start_time);
          const formattedStart = startTime.toLocaleString('en-US', { 
            timeZone: timezone,
            dateStyle: 'short',
            timeStyle: 'short'
          });
          
          return `
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${employeeName}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${employeeId}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${projectName}</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${formattedStart}</td>
            </tr>
          `;
        }).join('');

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Auto Clock-Out Notification</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #dc2626; margin: 0;">⚠️ Auto Clock-Out Alert</h1>
              </div>
              
              <p style="color: #374151; font-size: 16px;">
                The following employees were automatically clocked out because their shifts exceeded <strong>${MAX_SHIFT_HOURS} hours</strong> without clocking out:
              </p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 12px 8px; border: 1px solid #e5e7eb; text-align: left;">Employee</th>
                    <th style="padding: 12px 8px; border: 1px solid #e5e7eb; text-align: left;">ID</th>
                    <th style="padding: 12px 8px; border: 1px solid #e5e7eb; text-align: left;">Project</th>
                    <th style="padding: 12px 8px; border: 1px solid #e5e7eb; text-align: left;">Clock In</th>
                  </tr>
                </thead>
                <tbody>
                  ${employeeListHtml}
                </tbody>
              </table>
              
              <p style="color: #6b7280; font-size: 14px;">
                These time entries have been closed with an end time of 11:59:59 PM. 
                Please review and adjust if necessary in the Admin Time Tracking section.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated notification from ${companyName}'s CICO Time Tracking System.
              </p>
            </div>
          </body>
          </html>
        `;

        try {
          const { error: emailError } = await resend.emails.send({
            from: 'CICO Alerts <reports@notifications.battlebornsteel.com>',
            to: adminEmails,
            subject: `⚠️ Auto Clock-Out: ${entries.length} employee(s) exceeded ${MAX_SHIFT_HOURS}-hour shift limit`,
            html: emailHtml,
          });

          if (emailError) {
            console.error('Failed to send admin notification email:', emailError);
          } else {
            emailsSent.push(...adminEmails);
            console.log(`Sent notification email to ${adminEmails.length} admins for company ${companyId}`);
          }
        } catch (emailErr) {
          console.error('Email send error:', emailErr);
        }
      }
    }

    console.log(`Auto-close complete. Closed ${closedEntries.length} entries, sent ${emailsSent.length} emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        closed: closedEntries.length,
        closed_entry_ids: closedEntries,
        emails_sent: emailsSent.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-close-overtime-shifts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
