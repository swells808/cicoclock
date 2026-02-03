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

    const { data: { user: callingUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { profile_id, email, password, role } = await req.json();

    if (!profile_id || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'profile_id, email, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating auth account for profile ${profile_id} with email ${email}`);

    const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        display_name: profile.display_name
      }
    });

    if (createAuthError) {
      console.error('Error creating auth user:', createAuthError);
      return new Response(
        JSON.stringify({ error: createAuthError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auth user created with id: ${authData.user?.id}`);

    // Delete any auto-generated profile created by the handle_new_user trigger
    // This happens because the trigger fires when a new auth user is created
    const { error: deleteAutoProfile } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', authData.user?.id)
      .neq('id', profile_id);  // Don't delete the original profile

    if (deleteAutoProfile) {
      console.log('No auto-created profile to delete or error:', deleteAutoProfile.message);
    } else {
      console.log('Cleaned up any auto-created duplicate profile');
    }

    // Now safely update the original profile with the new user_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        user_id: authData.user?.id,
        email 
      })
      .eq('id', profile_id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      // Return success anyway since the auth account was created
    } else {
      console.log(`Profile ${profile_id} updated with user_id ${authData.user?.id}`);
    }

    // Handle role assignment - check if role already exists for this profile
    if (role && authData.user) {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('profile_id', profile_id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role with the new user_id
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .update({
            user_id: authData.user.id,
            role
          })
          .eq('id', existingRole.id);

        if (roleUpdateError) {
          console.error('Error updating user role:', roleUpdateError);
        } else {
          console.log(`Updated existing role ${existingRole.id} with user_id`);
        }
      } else {
        // Create new role record
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            profile_id: profile_id,
            role
          });

        if (roleError) {
          console.error('Error creating user role:', roleError);
        } else {
          console.log(`Created new role for profile ${profile_id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: authData.user?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-auth-account:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
