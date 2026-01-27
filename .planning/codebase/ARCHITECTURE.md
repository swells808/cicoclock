# Architecture

**Analysis Date:** 2026-01-27

## Pattern Overview

**Overall:** Single-Page Application (SPA) with Backend-as-a-Service (Supabase)

**Key Characteristics:**
- React SPA with client-side routing via react-router-dom
- Supabase provides auth, database (Postgres), edge functions, and storage
- Multi-tenant architecture scoped by `company_id` on all queries
- Custom hooks encapsulate all data fetching (no service layer)
- React Context for global state (auth, company, language)
- TanStack Query for server state caching on some hooks; others use raw useState/useEffect

## Layers

**Pages (View Layer):**
- Purpose: Route-level components that compose UI from smaller components and hooks
- Location: `src/pages/`
- Contains: 23 page components (e.g., `Dashboard.tsx`, `Timeclock.tsx`, `Reports.tsx`)
- Depends on: hooks, contexts, components
- Used by: Router in `src/App.tsx`

**Components (UI Layer):**
- Purpose: Reusable and feature-specific UI components
- Location: `src/components/`
- Contains: Feature folders (`dashboard/`, `timeclock/`, `reports/`, `admin/`, `employee/`, `settings/`, `users/`, `clients/`, `badge/`, `task-checkin/`, `home/`, `auth/`, `layout/`) plus shadcn/ui primitives in `ui/`
- Depends on: hooks, contexts, ui primitives
- Used by: Pages

**Hooks (Data Layer):**
- Purpose: Encapsulate all Supabase queries, mutations, and business logic
- Location: `src/hooks/`
- Contains: 29 custom hooks (e.g., `useEmployees.ts`, `useTimeEntries.ts`, `useReports.ts`)
- Depends on: Supabase client, contexts
- Used by: Pages and components

**Contexts (Global State):**
- Purpose: Provide auth session, company data, and language across the app
- Location: `src/contexts/`
- Contains: `AuthContext.tsx`, `CompanyContext.tsx`, `LanguageContext.tsx`
- Depends on: Supabase client
- Used by: All layers via `useAuth()`, `useCompany()`, `useLanguage()`

**Integrations (External Clients):**
- Purpose: Configure and export Supabase client with typed Database schema
- Location: `src/integrations/supabase/`
- Contains: `client.ts` (Supabase client singleton), `types.ts` (generated Database types)
- Depends on: `@supabase/supabase-js`
- Used by: Hooks, contexts

**Edge Functions (Server-side Logic):**
- Purpose: Secure server-side operations (auth, billing, automated tasks)
- Location: `supabase/functions/`
- Contains: 19 Deno edge functions (e.g., `clock-in-out/`, `authenticate-pin/`, `stripe/`, `process-scheduled-reports/`)
- Depends on: Supabase Admin SDK, external APIs (Stripe, Resend)
- Used by: Called from client via `supabase.functions.invoke()`

**Utilities:**
- Purpose: Shared helper functions
- Location: `src/utils/` and `src/lib/`
- Contains: `reportUtils.ts`, `reportExportUtils.ts`, `photoUtils.ts`, `badgeUrlUtils.ts`, `lib/utils.ts` (cn helper), `lib/constants.ts`

## Data Flow

**Clock In/Out Flow:**
1. User clicks clock in on `src/pages/Dashboard.tsx` or `src/pages/Timeclock.tsx`
2. Optional photo capture via `src/components/timeclock/PhotoCapture.tsx`
3. Page calls Supabase edge function `clock-in-out` via `supabase.functions.invoke()`
4. Edge function (`supabase/functions/clock-in-out/`) validates and inserts into `time_entries` table
5. Client refetches time entries via TanStack Query or manual `fetchEmployees()`

**Data Query Flow (typical hook pattern):**
1. Component calls custom hook (e.g., `useEmployees()`)
2. Hook reads `company.id` from `useCompany()` context
3. Hook queries Supabase with `.from('table').select().eq('company_id', company.id)`
4. Results stored in local `useState`, returned to component
5. Some hooks use TanStack Query (`useTimeEntries`, `useProjects`) for caching

**Authentication Flow:**
1. `src/contexts/AuthContext.tsx` initializes Supabase auth listener on mount
2. `supabase.auth.onAuthStateChange` updates `user` and `session` state
3. `src/components/auth/ProtectedRoute.tsx` checks auth state, redirects to `/login` if unauthenticated
4. `src/contexts/CompanyContext.tsx` fetches company data once user is authenticated (via `profiles.company_id`)

**State Management:**
- Auth state: React Context (`AuthContext`)
- Company/tenant state: React Context (`CompanyContext`)
- Language: React Context (`LanguageContext`)
- Server data: Mix of TanStack Query and raw useState/useEffect in hooks
- Form state: react-hook-form with zod validation

## Key Abstractions

**Multi-Tenant Scoping:**
- Purpose: All data queries are scoped to the authenticated user's company
- Examples: `src/hooks/useEmployees.ts`, `src/hooks/useProjects.ts`, `src/hooks/useTimeEntries.ts`
- Pattern: Every hook calls `useCompany()` and filters by `company.id`; Supabase RLS provides server-side enforcement

**ProtectedRoute:**
- Purpose: Auth guard for authenticated pages
- Examples: `src/components/auth/ProtectedRoute.tsx`
- Pattern: Wraps route element, checks `useAuth()`, redirects to `/login`

**DashboardLayout:**
- Purpose: Shared layout wrapper for all authenticated pages
- Examples: `src/components/layout/DashboardLayout.tsx`
- Pattern: Provides sidebar navigation, header, and content area

**Feature Hooks:**
- Purpose: Encapsulate data access + business logic per domain
- Examples: `src/hooks/useEmployees.ts`, `src/hooks/useReports.ts`, `src/hooks/useTimeEntries.ts`
- Pattern: Return `{ data, loading, error, refetch }` or similar shape

## Entry Points

**Client Application:**
- Location: `src/main.tsx` (Vite entry) -> `src/App.tsx` (root component)
- Triggers: Browser navigation
- Responsibilities: Provider tree setup, routing

**Edge Functions:**
- Location: `supabase/functions/[function-name]/index.ts`
- Triggers: HTTP requests via `supabase.functions.invoke()` or cron (e.g., `process-scheduled-reports`)
- Responsibilities: Secure operations requiring admin privileges

**Database Migrations:**
- Location: `supabase/migrations/`
- Triggers: `supabase db push` or deployment
- Responsibilities: Schema changes, RLS policies

## Error Handling

**Strategy:** Try/catch in hooks with error state

**Patterns:**
- Hooks: `try { ... } catch (err) { setError(err.message) }` returning error state to components
- Toast notifications for user-facing errors via `useToast()` from `src/hooks/use-toast.ts`
- Edge functions: Return JSON `{ error: message }` with appropriate HTTP status

## Cross-Cutting Concerns

**Logging:** `console.error()` in catch blocks; no structured logging framework
**Validation:** Zod schemas with react-hook-form for form validation
**Authentication:** Supabase Auth via `AuthContext`; RLS on database; `ProtectedRoute` on client
**Multi-tenancy:** `company_id` scoping in every query + Supabase RLS policies

---

*Architecture analysis: 2026-01-27*
