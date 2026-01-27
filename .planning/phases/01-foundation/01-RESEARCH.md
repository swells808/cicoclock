# Phase 1: Foundation - Research

**Researched:** 2026-01-27
**Domain:** Supabase infrastructure (migrations, edge functions, secrets) + company feature toggle
**Confidence:** HIGH

## Summary

Phase 1 lays infrastructure: a database table, an edge function stub, Azure secrets, and a company toggle. All four deliverables follow patterns already established in this codebase. The `company_features` table already has boolean toggles (employee_pin, geolocation, photo_capture) -- adding `face_verification` is a column addition. Edge functions follow a consistent pattern (Deno + service role client). Migrations use Supabase CLI-generated UUIDs.

No new libraries are needed. No external API calls happen in this phase (the edge function is stubbed). The only coordination risk is ensuring the `face_verifications` table schema anticipates Phase 2 needs.

**Primary recommendation:** Follow existing codebase conventions exactly. Every pattern needed already exists in the project.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.87.1 | DB client (edge function + frontend) | Already used everywhere |
| Deno std http/server | 0.168.0 | Edge function runtime | All 19 existing functions use this |
| @tanstack/react-query | ^5.83.0 | Frontend data fetching | Used by useCompanyFeatures hook |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.25.76 | Input validation | Optional for edge function request validation |

### No New Dependencies Needed

Phase 1 requires zero new npm packages or Deno imports. Everything uses existing project infrastructure.

## Architecture Patterns

### Recommended Project Structure
```
supabase/
├── migrations/
│   └── YYYYMMDDHHMMSS_*.sql    # New migration for face_verifications table + company_features column
├── functions/
│   └── verify-face/
│       └── index.ts             # Stubbed edge function
└── config.toml                  # Add [functions.verify-face] entry

src/
├── hooks/
│   └── useCompanyFeatures.ts    # Already exists, no changes needed (reads all columns)
├── integrations/supabase/
│   └── types.ts                 # Must regenerate after migration
└── components/settings/
    └── CompanyForm.tsx           # Add face_verification toggle here
```

### Pattern 1: Edge Function (Established Convention)
**What:** Deno function with CORS, service role client, JSON request/response
**When to use:** Every edge function in this project
**Example:**
```typescript
// Source: supabase/functions/clock-in-out/index.ts (existing pattern)
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
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    // ... logic ...
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Pattern 2: RLS Policies (Established Convention)
**What:** Company-scoped RLS using `get_current_user_company_id()` and `has_role()`
**When to use:** Every table with company_id
**Example:**
```sql
-- Source: supabase/migrations/20251219210139_*.sql (existing pattern)
ALTER TABLE public.face_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company verifications"
ON public.face_verifications FOR SELECT
USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Admins can update verifications"
ON public.face_verifications FOR UPDATE
USING (company_id = public.get_current_user_company_id() AND public.has_role(auth.uid(), 'admin'));
```

### Pattern 3: Company Features Toggle (Established Convention)
**What:** Boolean column on `company_features` table, one row per company
**When to use:** Any company-level feature flag
**Example:**
```sql
-- Add to company_features (follows employee_pin, geolocation, photo_capture pattern)
ALTER TABLE public.company_features
ADD COLUMN face_verification BOOLEAN NOT NULL DEFAULT false;
```
Frontend reads via `useCompanyFeatures()` hook which already does `select("*")` -- new column is automatically available.

### Pattern 4: config.toml Function Registration
**What:** Each edge function needs a `[functions.name]` entry with `verify_jwt` setting
**When to use:** Every new edge function
```toml
[functions.verify-face]
verify_jwt = false
```
Note: `verify_jwt = false` because the clock-in flow calls this without a JWT (same as clock-in-out, authenticate-pin, etc.). The function uses service role key internally.

### Anti-Patterns to Avoid
- **Don't use the _shared/cors.ts:** Most existing functions define corsHeaders inline. Be consistent with the function you are modeling (clock-in-out defines inline).
- **Don't add RLS INSERT policy for service role:** Edge functions use service_role_key which bypasses RLS. INSERT policy is unnecessary if only the edge function writes to face_verifications.
- **Don't create a separate settings table:** The company_features table already exists for this purpose.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Company-scoped data access | Custom auth checks | `get_current_user_company_id()` RLS function | Already exists, battle-tested |
| Feature flag storage | New settings table | `company_features` table column | Pattern established, hook exists |
| Supabase type generation | Manual type definitions | `supabase gen types typescript` | Keeps types in sync with schema |
| Edge function auth | Custom JWT parsing | Service role key via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` | Standard pattern in all functions |

## Common Pitfalls

### Pitfall 1: face_verifications Schema Missing Phase 2 Fields
**What goes wrong:** Table created with minimal columns, then Phase 2 requires ALTER TABLE to add critical fields.
**Why it happens:** Phase 1 says "stub" so developers create a minimal table.
**How to avoid:** Design the full table schema now. Include: time_entry_id, profile_id, company_id, clock_photo_url, profile_photo_url, confidence_score, is_match, status (enum: pending/verified/failed/no_face/error), error_message, reviewed_by, reviewed_at, review_decision. Phase 2 and 3 should not need schema changes.
**Warning signs:** Table has fewer than 10 columns.

### Pitfall 2: Forgetting to Regenerate Supabase Types
**What goes wrong:** Migration adds face_verification to company_features, but `types.ts` still has the old schema. Frontend TypeScript errors or runtime failures.
**Why it happens:** Type generation is a manual step.
**How to avoid:** Run `supabase gen types typescript --project-id ahtiicqunajyyasuxebj > src/integrations/supabase/types.ts` after migration.
**Warning signs:** TypeScript errors on `data.face_verification`.

### Pitfall 3: Edge Function Stub That Can't Be Extended
**What goes wrong:** Stub returns hardcoded response without accepting the parameters Phase 2 needs.
**Why it happens:** "It's just a stub" mindset.
**How to avoid:** Accept the full request shape (time_entry_id, profile_id, company_id, clock_photo_url, profile_photo_url) and validate inputs. Return a stubbed verification result in the correct response shape. Phase 2 only replaces the stub logic, not the interface.

### Pitfall 4: Missing Service Role Insert for Edge Function
**What goes wrong:** Edge function tries to insert into face_verifications but gets RLS denied.
**Why it happens:** RLS is enabled but no INSERT policy exists, and developer forgets that service_role_key bypasses RLS.
**How to avoid:** Service role key bypasses RLS entirely. No INSERT policy is needed for edge-function-only writes. However, if you want the frontend to also insert (unlikely), you would need a policy. Clarify: only the edge function writes to this table.

### Pitfall 5: Toggle UI Without Checking Existing Admin Pages
**What goes wrong:** New settings page created instead of adding to existing CompanyForm.tsx.
**Why it happens:** Developer doesn't explore existing admin UI.
**How to avoid:** The toggle belongs in `src/components/settings/CompanyForm.tsx` which already manages company_features. Add a Switch component following the existing pattern.

## Code Examples

### Migration: face_verifications Table
```sql
-- Full schema designed for Phase 1-3 needs
CREATE TABLE public.face_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  clock_photo_url TEXT,
  profile_photo_url TEXT,
  confidence_score NUMERIC(4,3),
  is_match BOOLEAN,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'failed', 'no_face', 'error', 'skipped')),
  error_message TEXT,
  verified_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_decision TEXT CHECK (review_decision IN ('approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_face_verifications_time_entry ON public.face_verifications(time_entry_id);
CREATE INDEX idx_face_verifications_company ON public.face_verifications(company_id);
CREATE INDEX idx_face_verifications_status ON public.face_verifications(company_id, status);

ALTER TABLE public.face_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own company verifications"
ON public.face_verifications FOR SELECT
USING (company_id = public.get_current_user_company_id());

CREATE POLICY "Admins update verifications"
ON public.face_verifications FOR UPDATE
USING (company_id = public.get_current_user_company_id()
  AND public.has_role(auth.uid(), 'admin'));
```

### Migration: Add Toggle to company_features
```sql
ALTER TABLE public.company_features
ADD COLUMN face_verification BOOLEAN NOT NULL DEFAULT false;
```

### Edge Function Stub: verify-face/index.ts
```typescript
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
    const { time_entry_id, profile_id, company_id, clock_photo_url, profile_photo_url } = await req.json();

    if (!time_entry_id || !profile_id || !company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify Azure secrets are accessible (Phase 1 validation)
    const azureEndpoint = Deno.env.get('AZURE_FACE_ENDPOINT');
    const azureKey = Deno.env.get('AZURE_FACE_API_KEY');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Stub: insert a pending verification record
    const { data, error } = await supabase
      .from('face_verifications')
      .insert({
        time_entry_id,
        profile_id,
        company_id,
        clock_photo_url: clock_photo_url || null,
        profile_photo_url: profile_photo_url || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
        azure_configured: !!(azureEndpoint && azureKey),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### Secrets Configuration
```bash
supabase secrets set AZURE_FACE_ENDPOINT="https://your-resource.cognitiveservices.azure.com"
supabase secrets set AZURE_FACE_API_KEY="your-api-key-here"
```

### config.toml Entry
```toml
[functions.verify-face]
verify_jwt = false
```

### Deploy Edge Function
```bash
supabase functions deploy verify-face --project-ref ahtiicqunajyyasuxebj
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `serve()` from std@0.131.0 | `serve()` from std@0.168.0 | Mid-2023 | This project already uses 0.168.0 |

No migration from old patterns needed -- the project is already current.

## Open Questions

1. **Should face_verifications allow multiple records per time_entry?**
   - What we know: A time entry has clock-in and clock-out, each could have a verification
   - Recommendation: Allow multiple (no UNIQUE constraint on time_entry_id). Add a `verification_type` column ('clock_in' | 'clock_out') if needed, or handle in Phase 2.

2. **Should the toggle UI be in CompanyForm.tsx or a new settings section?**
   - What we know: CompanyForm.tsx already handles company_features toggles
   - Recommendation: Add to CompanyForm.tsx. Examine the file during planning for exact placement.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: supabase/functions/clock-in-out/index.ts (edge function pattern)
- Codebase inspection: supabase/migrations/20251219210139_*.sql (RLS pattern with get_current_user_company_id)
- Codebase inspection: src/integrations/supabase/types.ts (company_features schema)
- Codebase inspection: supabase/config.toml (function registration pattern)
- Codebase inspection: src/hooks/useCompanyFeatures.ts (feature flag reading pattern)

### Secondary (MEDIUM confidence)
- .planning/research/STACK.md (Azure Face API details, verified against Microsoft docs)
- .planning/research/PITFALLS.md (domain pitfalls)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new deps
- Architecture: HIGH - all patterns copied from existing codebase
- Pitfalls: HIGH - derived from codebase inspection and prior research

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (stable infrastructure, unlikely to change)
