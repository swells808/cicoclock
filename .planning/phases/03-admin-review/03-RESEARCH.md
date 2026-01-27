# Phase 3: Admin Review - Research

**Researched:** 2026-01-27
**Domain:** React UI extension, Supabase queries, admin workflows
**Confidence:** HIGH

## Summary

Phase 3 extends the existing `AdminTimeTracking` page to surface face verification results. The database schema (`face_verifications`) already has all needed columns: `review_decision` (approved/rejected), `reviewed_by`, `reviewed_at`, `confidence_score`, `is_match`, `clock_photo_url`, `profile_photo_url`. RLS policies already permit admin updates. The generated TypeScript types already include these columns.

The work is purely frontend: query `face_verifications` alongside time entries, show flag indicators, build a side-by-side photo review dialog, and add approve/reject actions.

**Primary recommendation:** Join `face_verifications` data into the existing time entries query, add a flag badge to `TimeEntryTimelineCard`, and create a new `FaceReviewDialog` component following the existing dialog pattern.

## Standard Stack

### Core (already in project)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| @tanstack/react-query | Data fetching, cache invalidation | Already used for all queries |
| @supabase/supabase-js | DB queries, signed URLs, RLS | Already the data layer |
| shadcn/ui Dialog | Modal for side-by-side review | Already used in 13+ dialogs |
| shadcn/ui Badge | Flag indicators | Already used in TimeEntryTimelineCard |
| lucide-react | Icons (ShieldAlert, ShieldCheck, ShieldX) | Already the icon library |

### No new libraries needed

This phase requires zero new dependencies.

## Architecture Patterns

### Pattern 1: Extend Existing Query with Join

The `AdminTimeTracking` page fetches time entries then manually joins profiles. Follow the same pattern to join `face_verifications`:

```typescript
// After fetching time entries, fetch verifications for those entry IDs
const entryIds = data.map(e => e.id);
const { data: verifications } = await supabase
  .from('face_verifications')
  .select('*')
  .in('time_entry_id', entryIds);

// Build map: time_entry_id -> verification
const verificationMap = new Map();
verifications?.forEach(v => verificationMap.set(v.time_entry_id, v));
```

**Why this pattern:** The existing code already uses manual joins (profiles). Supabase foreign key ambiguity makes `.select()` joins unreliable in this codebase.

### Pattern 2: Dialog Component for Review

Follow existing dialog pattern (see `EditTimeEntryDialog`, `ClientDialog`):

```typescript
// FaceReviewDialog.tsx
interface FaceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verification: FaceVerification | null;
  onSuccess: () => void;
}
```

### Pattern 3: Signed URL Reuse

Clock photos already have signed URLs generated in `AdminTimeTracking` (lines 174-214). Profile photos from `face_verifications.profile_photo_url` need their own signed URLs. Extend the existing `fetchSignedUrls` effect to also fetch profile photo URLs.

### Pattern 4: Summary Count via Separate Query

For ADMIN-04 (unreviewed count badge), use a separate lightweight query:

```typescript
const { data: flaggedCount } = useQuery({
  queryKey: ['flagged-count', company?.id],
  queryFn: async () => {
    const { count } = await supabase
      .from('face_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company!.id)
      .eq('is_match', false)
      .is('review_decision', null);
    return count || 0;
  },
  enabled: !!company?.id,
});
```

### Recommended File Structure

```
src/
├── components/admin/
│   └── FaceReviewDialog.tsx       # NEW: side-by-side review dialog
├── hooks/
│   └── useFaceVerifications.ts    # NEW: query hook for verifications
├── pages/
│   └── AdminTimeTracking.tsx      # MODIFY: add flag badges + review dialog
├── components/reports/
│   └── TimeEntryTimelineCard.tsx  # MODIFY: add flag indicator prop
```

### Anti-Patterns to Avoid
- **Don't create a separate page:** Requirements say extend AdminTimeTracking, not build a new route
- **Don't use Supabase relational joins:** This codebase manually joins to avoid FK ambiguity issues (see line 152 of AdminTimeTracking)
- **Don't fetch all verifications globally:** Scope to the selected date's entries

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialogs | Custom modal | shadcn Dialog | Already used 13+ times in codebase |
| Image signed URLs | Custom URL signing | supabase.storage.createSignedUrl | Already used in AdminTimeTracking |
| Data fetching/caching | Custom state management | @tanstack/react-query | Already the pattern everywhere |
| Badge/indicator UI | Custom styled divs | shadcn Badge + lucide icons | Consistent with existing UI |

## Common Pitfalls

### Pitfall 1: Forgetting Signed URLs for Profile Photos
**What goes wrong:** Profile photos stored in Supabase storage need signed URLs just like clock photos
**How to avoid:** Fetch signed URLs for `face_verifications.profile_photo_url` in the same effect that handles clock photo URLs

### Pitfall 2: TypeScript Types Already Generated
**What goes wrong:** Manually defining types that conflict with generated ones
**How to avoid:** Import from `@/integrations/supabase/types.ts` -- `face_verifications` Row type already exists with all columns including `review_decision`, `reviewed_by`, `reviewed_at`

### Pitfall 3: RLS Already Configured
**What goes wrong:** Trying to create new RLS policies that conflict
**How to avoid:** RLS is already set up: SELECT for company users, UPDATE for admins. No migration needed.

### Pitfall 4: Multiple Verifications Per Entry
**What goes wrong:** A time entry could have multiple verification records (clock-in and clock-out)
**How to avoid:** Query verifications and take the latest or the one with `is_match = false` for flagging. Consider using `.order('created_at', { ascending: false })` and grouping by time_entry_id.

### Pitfall 5: Feature Flag Check
**What goes wrong:** Showing verification UI when face_verification is disabled
**How to avoid:** Gate all new UI behind `companyFeatures?.face_verification` (already available via `useCompanyFeatures`)

## Code Examples

### Flag Badge on TimeEntryTimelineCard
```typescript
// Add to TimeEntryForCard interface:
flagStatus?: 'flagged' | 'approved' | 'rejected' | null;

// In header row, after existing badges:
{flagStatus === 'flagged' && (
  <Badge variant="destructive" className="text-xs gap-1">
    <ShieldAlert className="h-3 w-3" /> Flagged
  </Badge>
)}
{flagStatus === 'approved' && (
  <Badge variant="outline" className="text-xs gap-1 text-green-600">
    <ShieldCheck className="h-3 w-3" /> Cleared
  </Badge>
)}
```

### Admin Review Update
```typescript
const handleReview = async (decision: 'approved' | 'rejected') => {
  const { error } = await supabase
    .from('face_verifications')
    .update({
      review_decision: decision,
      reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', verification.id);

  if (!error) onSuccess();
};
```

### Side-by-Side Photo Layout
```typescript
<div className="grid grid-cols-2 gap-4">
  <div className="text-center">
    <p className="text-sm font-medium mb-2">Profile Photo</p>
    <img src={profileSignedUrl} className="w-full rounded-lg" />
  </div>
  <div className="text-center">
    <p className="text-sm font-medium mb-2">Clock Photo</p>
    <img src={clockSignedUrl} className="w-full rounded-lg" />
  </div>
</div>
<div className="text-center">
  <p className="text-sm text-muted-foreground">
    Confidence: {(verification.confidence_score * 100).toFixed(1)}%
  </p>
</div>
```

## State of the Art

| Aspect | Status | Impact |
|--------|--------|--------|
| DB schema | Complete with review columns | No migration needed |
| RLS policies | Admin update policy exists | No policy changes needed |
| TypeScript types | Generated and include all columns | Import directly |
| Feature flag | `face_verification` column on company_features | Gate all new UI |

## Open Questions

1. **What constitutes "flagged"?**
   - Most likely: `is_match = false` AND `review_decision IS NULL`
   - Could also include `status = 'no_face'` or `status = 'error'`
   - Recommendation: Flag entries where `is_match = false` (mismatch detected). Optionally show `no_face`/`error` as warnings.

2. **Multiple verifications per time entry**
   - Clock-in and clock-out could each trigger verification
   - Recommendation: Show the worst result (any `is_match = false` flags the entry)

## Sources

### Primary (HIGH confidence)
- Codebase: `supabase/migrations/20260127181524_face_verifications.sql` - full schema with review columns
- Codebase: `src/integrations/supabase/types.ts` - generated types include all face_verifications columns
- Codebase: `src/pages/AdminTimeTracking.tsx` - existing page structure, query patterns, signed URL handling
- Codebase: `src/components/reports/TimeEntryTimelineCard.tsx` - card component to extend

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, everything exists in project
- Architecture: HIGH - follows existing patterns exactly
- Pitfalls: HIGH - based on direct codebase analysis

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (stable - all based on existing codebase patterns)
