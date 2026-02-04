import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit: 20 requests per minute per company+IP
const MAX_REQUESTS = 20;
const WINDOW_MS = 60 * 1000; // 1 minute

function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (rateLimitStore.size > 5000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) rateLimitStore.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

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

    // Rate limiting
    const clientIP = getClientIP(req);
    const rateLimitKey = `lookup:${company_id}:${clientIP}`;
    const rateResult = checkRateLimit(rateLimitKey);

    if (!rateResult.allowed) {
      console.warn(`[SECURITY] Rate limit exceeded for lookup: company=${company_id}, ip=${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // SECURITY: Remove has_pin from response to prevent enumeration attacks
    // The client should assume PIN is required if PIN auth is enabled for the company
    return new Response(
      JSON.stringify({ 
        found: true, 
        employee: {
          id: employee.profile_id,
          user_id: employee.user_id,
          display_name: employee.display_name,
          first_name: employee.first_name,
          last_name: employee.last_name,
          // has_pin intentionally removed - security improvement
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
