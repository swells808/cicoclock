# Codebase Structure

**Analysis Date:** 2026-01-27

## Directory Layout

```
cicoclock/
├── public/                  # Static assets
├── src/                     # Frontend application source
│   ├── components/          # React components by feature
│   │   ├── admin/           # Admin time tracking UI
│   │   ├── auth/            # Login, signup, ProtectedRoute
│   │   ├── badge/           # Badge designer/viewer
│   │   ├── clients/         # Client management
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── employee/        # Employee detail views
│   │   │   └── tabs/        # Tab components for employee detail
│   │   ├── home/            # Public landing page sections
│   │   ├── layout/          # DashboardLayout, navigation
│   │   ├── reports/         # Report generation/viewing
│   │   ├── settings/        # Settings panels
│   │   ├── task-checkin/    # Task check-in flow
│   │   ├── timeclock/       # Timeclock UI (photo capture, etc.)
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── users/           # User management
│   │   ├── NavLink.tsx      # Shared nav link component
│   │   └── PasswordDialog.tsx # Shared password dialog
│   ├── contexts/            # React Context providers
│   ├── hooks/               # Custom React hooks (data layer)
│   ├── integrations/        # External service clients
│   │   └── supabase/        # Supabase client + generated types
│   ├── lib/                 # Shared utilities (cn, constants)
│   ├── pages/               # Route-level page components
│   ├── utils/               # Domain-specific utility functions
│   ├── App.tsx              # Root component with providers + routes
│   ├── main.tsx             # Vite entry point
│   └── index.css            # Global styles (Tailwind)
├── supabase/                # Supabase project config
│   ├── functions/           # Deno edge functions
│   │   ├── _shared/         # Shared edge function utilities (cors.ts)
│   │   ├── clock-in-out/    # Clock in/out logic
│   │   ├── authenticate-pin/# PIN auth for timeclock
│   │   ├── stripe/          # Stripe webhook/billing
│   │   ├── process-scheduled-reports/ # Cron: scheduled reports
│   │   ├── auto-close-tasks-on-shift-end/ # Cron: auto-close
│   │   ├── create-company/  # Company onboarding
│   │   ├── create-user/     # User creation
│   │   ├── create-auth-account/ # Auth account setup
│   │   ├── admin-retroactive-clockout/ # Admin clock-out correction
│   │   ├── admin-reset-password/ # Admin password reset
│   │   ├── generate-badge/  # Badge PDF generation
│   │   ├── verify-badge/    # Badge verification
│   │   ├── verify-task/     # Task verification
│   │   ├── check-clock-status/ # Clock status check
│   │   ├── lookup-employee/ # Employee lookup
│   │   ├── record-task-activity/ # Task activity recording
│   │   ├── send-test-report/ # Test report email
│   │   ├── send-recipient-welcome-email/ # Welcome email
│   │   └── migrate-timeclock-photos/ # Data migration
│   └── migrations/          # SQL migration files
├── docs/                    # Documentation
├── index.html               # Vite HTML entry
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript config (root)
├── tsconfig.app.json        # TypeScript config (app)
├── tsconfig.node.json       # TypeScript config (node/build)
├── components.json          # shadcn/ui config
├── eslint.config.js         # ESLint config
└── postcss.config.js        # PostCSS config
```

## Directory Purposes

**`src/pages/`:**
- Purpose: One file per route, named after the feature
- Contains: 23 page components
- Key files: `Dashboard.tsx`, `Timeclock.tsx`, `Reports.tsx`, `Settings.tsx`, `EmployeeDetail.tsx`

**`src/hooks/`:**
- Purpose: All data fetching and business logic
- Contains: 29 custom hooks
- Key files: `useTimeEntries.ts`, `useEmployees.ts`, `useReports.ts`, `useUserRole.ts`, `useCompanyFeatures.ts`

**`src/components/ui/`:**
- Purpose: shadcn/ui primitive components (auto-generated, do not modify patterns)
- Contains: Button, Card, Dialog, Select, Toast, etc.

**`src/components/[feature]/`:**
- Purpose: Feature-specific composed components
- Contains: Components used by the corresponding page

**`src/contexts/`:**
- Purpose: Global app state providers
- Key files: `AuthContext.tsx` (auth session), `CompanyContext.tsx` (tenant data), `LanguageContext.tsx` (i18n)

**`src/integrations/supabase/`:**
- Purpose: Supabase client configuration and generated types
- Key files: `client.ts` (singleton client), `types.ts` (Database type from Supabase CLI)

**`supabase/functions/`:**
- Purpose: Server-side Deno edge functions
- Key files: Each function has its own directory with `index.ts`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Vite app entry, renders `<App />`
- `src/App.tsx`: Provider tree + all route definitions
- `index.html`: HTML shell

**Configuration:**
- `vite.config.ts`: Build config, path aliases (`@` -> `src/`)
- `tailwind.config.ts`: Theme, colors, animations
- `tsconfig.app.json`: TypeScript paths, strict mode
- `components.json`: shadcn/ui component generation config

**Core Logic:**
- `src/contexts/AuthContext.tsx`: Authentication state management
- `src/contexts/CompanyContext.tsx`: Multi-tenant company data
- `src/integrations/supabase/client.ts`: Supabase client singleton
- `src/components/auth/ProtectedRoute.tsx`: Route guard

**Utilities:**
- `src/lib/utils.ts`: `cn()` helper (clsx + tailwind-merge)
- `src/lib/constants.ts`: App-wide constants
- `src/utils/reportUtils.ts`: Report data processing
- `src/utils/reportExportUtils.ts`: PDF/CSV export
- `src/utils/photoUtils.ts`: Photo handling
- `src/utils/badgeUrlUtils.ts`: Badge URL generation

## Naming Conventions

**Files:**
- Pages: `PascalCase.tsx` (e.g., `Dashboard.tsx`, `EmployeeDetail.tsx`)
- Components: `PascalCase.tsx` (e.g., `PhotoCapture.tsx`, `RecentTaskActivity.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useEmployees.ts`, `useTimeEntries.ts`)
- Utils: `camelCase.ts` (e.g., `reportUtils.ts`, `photoUtils.ts`)
- Contexts: `PascalCase.tsx` with `Context` suffix (e.g., `AuthContext.tsx`)

**Directories:**
- Feature folders: `kebab-case` (e.g., `task-checkin/`, `time-tracking/`)
- Single-word folders: `lowercase` (e.g., `admin/`, `badge/`, `layout/`)

**Exports:**
- Components: Default export matching filename
- Hooks: Named export matching filename (e.g., `export const useEmployees`)
- Contexts: Named exports for Provider and hook (e.g., `AuthProvider`, `useAuth`)

## Where to Add New Code

**New Page/Route:**
- Create page component: `src/pages/NewPage.tsx`
- Add route in `src/App.tsx` (public or wrapped in `<ProtectedRoute>`)
- Use `<DashboardLayout>` wrapper for authenticated pages

**New Feature Component:**
- Create directory: `src/components/feature-name/`
- Add components as `PascalCase.tsx` files within

**New Data Hook:**
- Create: `src/hooks/useFeatureName.ts`
- Follow pattern: import `supabase` client, use `useCompany()` for tenant scoping
- Return `{ data, loading, error, refetch }` shape

**New Edge Function:**
- Create directory: `supabase/functions/function-name/`
- Add `index.ts` with Deno serve handler
- Import CORS from `supabase/functions/_shared/cors.ts`

**New UI Primitive:**
- Use `npx shadcn-ui@latest add [component]` (do not manually create in `src/components/ui/`)

**New Utility:**
- Domain-specific: `src/utils/featureNameUtils.ts`
- General/shared: `src/lib/utils.ts`

## Special Directories

**`src/components/ui/`:**
- Purpose: shadcn/ui auto-generated primitives
- Generated: Yes (via shadcn CLI)
- Committed: Yes
- Note: Do not manually modify patterns; use shadcn CLI to add new components

**`supabase/migrations/`:**
- Purpose: SQL schema migrations
- Generated: Via Supabase CLI
- Committed: Yes

**`public/`:**
- Purpose: Static assets served at root
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-01-27*
