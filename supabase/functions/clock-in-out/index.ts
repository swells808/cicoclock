import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, profile_id, company_id, photo_url, time_entry_id } = await req.json();

    console.log('Clock in/out request:', { action, profile_id, company_id, time_entry_id });

    if (!action || !profile_id || !company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: action, profile_id, company_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the profile belongs to the company and is active
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, user_id, display_name, first_name, last_name, status')
      .eq('id', profile_id)
      .eq('company_id', company_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile verification failed:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Employee not found or not in this company' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.status !== 'active') {
      return new Response(
        JSON.stringify({ success: false, error: 'Employee is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For employees without user_id, we'll use profile_id as the user_id fallback
    const effectiveUserId = profile.user_id || profile_id;

    if (action === 'clock_in') {
      // Check if already clocked in using profile_id (more reliable)
      const { data: existingEntry } = await supabase
        .from('time_entries')
        .select('id')
        .eq('profile_id', profile_id)
        .eq('company_id', company_id)
        .is('end_time', null)
        .limit(1)
        .maybeSingle();

      if (existingEntry) {
        return new Response(
          JSON.stringify({ success: false, error: 'Already clocked in. Please clock out first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create new time entry with both user_id and profile_id
      const { data: newEntry, error: insertError } = await supabase
        .from('time_entries')
        .insert({
          user_id: effectiveUserId,
          profile_id: profile_id,
          company_id: company_id,
          start_time: new Date().toISOString(),
          clock_in_photo_url: photo_url || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Clock in insert error:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to clock in: ' + insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Clock in successful:', newEntry.id);
      return new Response(
        JSON.stringify({ success: true, data: newEntry, message: 'Clocked in successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    else if (action === 'clock_out') {
      // Find the active time entry using profile_id (more reliable)
      let entryId = time_entry_id;
      
      if (!entryId) {
        const { data: activeEntry, error: findError } = await supabase
          .from('time_entries')
          .select('id, start_time')
          .eq('profile_id', profile_id)
          .eq('company_id', company_id)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (findError || !activeEntry) {
          console.error('No active time entry found:', findError);
          return new Response(
            JSON.stringify({ success: false, error: 'No active time entry found. Are you clocked in?' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        entryId = activeEntry.id;
      }

      // Get the entry to calculate duration
      const { data: entry } = await supabase
        .from('time_entries')
        .select('start_time')
        .eq('id', entryId)
        .single();

      const endTime = new Date();
      const startTime = new Date(entry?.start_time || '');
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

      // Update the time entry
      const { data: updatedEntry, error: updateError } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          clock_out_photo_url: photo_url || null,
        })
        .eq('id', entryId)
        .select()
        .single();

      if (updateError) {
        console.error('Clock out update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to clock out: ' + updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Clock out successful:', updatedEntry.id);
      return new Response(
        JSON.stringify({ success: true, data: updatedEntry, message: 'Clocked out successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    else if (action === 'break') {
      const now = new Date().toISOString();
      const { data: breakEntry, error: breakError } = await supabase
        .from('time_entries')
        .insert({
          user_id: effectiveUserId,
          profile_id: profile_id,
          company_id: company_id,
          start_time: now,
          end_time: now,
          duration_minutes: 0,
          is_break: true,
        })
        .select()
        .single();

      if (breakError) {
        console.error('Break insert error:', breakError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to record break: ' + breakError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Break recorded:', breakEntry.id);
      return new Response(
        JSON.stringify({ success: true, data: breakEntry, message: 'Break recorded' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use: clock_in, clock_out, or break' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Clock in/out error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
