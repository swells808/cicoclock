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

// Rate limit config: 5 failed attempts per 15 minutes per company+IP
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries
  if (rateLimitStore.size > 5000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) rateLimitStore.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt: now + WINDOW_MS };
  }

  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count, resetAt: entry.resetAt };
}

function resetRateLimitOnSuccess(key: string): void {
  rateLimitStore.delete(key);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, pin } = await req.json();

    if (!company_id || !pin) {
      return new Response(
        JSON.stringify({ error: 'company_id and pin are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting - keyed by company_id + IP
    const clientIP = getClientIP(req);
    const rateLimitKey = `pin:${company_id}:${clientIP}`;
    const rateResult = checkRateLimit(rateLimitKey);

    const rateLimitHeaders = {
      'X-RateLimit-Remaining': rateResult.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateResult.resetAt / 1000).toString(),
    };

    if (!rateResult.allowed) {
      console.warn(`[SECURITY] Rate limit exceeded for PIN auth: company=${company_id}, ip=${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.rpc('authenticate_employee_pin', {
      _company_id: company_id,
      _pin: pin
    });

    if (error) {
      console.error('Authentication error:', error);
      console.warn(`[AUDIT] Failed PIN attempt: company=${company_id}, ip=${clientIP}, error=db_error`);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data || data.length === 0) {
      console.warn(`[AUDIT] Failed PIN attempt: company=${company_id}, ip=${clientIP}, error=invalid_pin`);
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success - reset rate limit counter
    resetRateLimitOnSuccess(rateLimitKey);
    
    console.log(`[AUDIT] Successful PIN auth: company=${company_id}, profile=${data[0].profile_id}, ip=${clientIP}`);

    return new Response(
      JSON.stringify({ success: true, user: data[0] }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in authenticate-pin:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
