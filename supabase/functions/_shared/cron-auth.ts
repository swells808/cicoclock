/**
 * Validate cron job requests using a shared secret
 * This prevents unauthorized triggering of automated jobs
 */

export function validateCronSecret(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  
  // If no secret is configured, allow requests (backwards compatibility)
  // But log a warning
  if (!cronSecret) {
    console.warn('[SECURITY] CRON_SECRET not configured - cron endpoint is unprotected');
    return true;
  }

  // Check Authorization header
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token === cronSecret) {
      return true;
    }
  }

  // Check X-Cron-Secret header (alternative)
  const cronHeader = req.headers.get('X-Cron-Secret');
  if (cronHeader === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Create an unauthorized response for cron endpoints
 */
export function cronUnauthorizedResponse(corsHeaders: Record<string, string>): Response {
  console.warn('[SECURITY] Unauthorized cron request rejected');
  return new Response(
    JSON.stringify({ error: 'Unauthorized - Invalid or missing cron secret' }),
    { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
