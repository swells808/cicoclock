# Coding Conventions

**Analysis Date:** 2026-01-27

## Naming Patterns

**Files:**
- Pages: PascalCase `.tsx` — `src/pages/Dashboard.tsx`, `src/pages/EmployeeDetail.tsx`
- Components: PascalCase `.tsx` — `src/components/timeclock/PhotoCapture.tsx`
- UI components (shadcn): kebab-case `.tsx` — `src/components/ui/button.tsx`, `src/components/ui/card.tsx`
- Hooks: camelCase with `use` prefix `.ts` — `src/hooks/useEmployees.ts`, `src/hooks/useTimeEntries.ts`
- Contexts: PascalCase with `Context` suffix `.tsx` — `src/contexts/AuthContext.tsx`, `src/contexts/CompanyContext.tsx`
- Utilities: camelCase `.ts` — `src/utils/reportUtils.ts`, `src/utils/photoUtils.ts`
- Directories: kebab-case or lowercase — `src/components/task-checkin/`, `src/components/employee/tabs/`

**Functions:**
- Use camelCase: `fetchEmployees`, `handleClockInOut`, `performClockIn`
- React components: PascalCase arrow functions: `const Dashboard = () => {`
- Hooks: camelCase with `use` prefix: `useEmployees`, `useTimeEntries`, `useActiveTimeEntry`
- Event handlers: `handle` prefix: `handlePhotoCapture`, `handleCancel`, `handleClockInOut`
- Internal async operations: `perform` prefix: `performClockIn`, `performClockOut`

**Variables:**
- camelCase for local state: `isClockedIn`, `selectedProject`, `currentTimeEntry`
- State setters follow `set` + PascalCase variable name: `setIsClockedIn`, `setSelectedProject`
- Boolean state uses `is`/`has` prefix: `isClockedIn`, `isOnBreak`, `isStreaming`

**Types/Interfaces:**
- PascalCase: `Employee`, `AuthContextType`, `PhotoCaptureProps`
- Component props: `[ComponentName]Props` — `PhotoCaptureProps`
- Context types: `[Name]ContextType` — `AuthContextType`
- Interfaces used over type aliases for object shapes

## Code Style

**Formatting:**
- No Prettier config detected; relies on editor defaults
- 2-space indentation (observed in all files)
- Double quotes for JSX attributes and imports in some files, single quotes in others (inconsistent)
- Semicolons used consistently
- Trailing commas in multi-line objects and arrays

**Linting:**
- ESLint 9 with flat config: `eslint.config.js`
- TypeScript-ESLint recommended rules
- `react-hooks` plugin with recommended rules
- `react-refresh` plugin for HMR
- `@typescript-eslint/no-unused-vars` is **disabled** (set to "off")
- TypeScript strict mode is **disabled** (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false`)

## Import Organization

**Order:**
1. React imports: `import React, { useState, useEffect } from 'react'`
2. Third-party libraries: `@tanstack/react-query`, `date-fns`, `lucide-react`, `sonner`
3. Internal aliases (`@/` prefix): components, contexts, hooks, integrations
4. Relative imports: `./pages/Index`, `./pages/Login`

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json` and `vite.config.ts`)
- Use `@/components/ui/...` for shadcn UI components
- Use `@/hooks/...` for custom hooks
- Use `@/contexts/...` for React contexts
- Use `@/integrations/supabase/client` for supabase client
- Use `@/lib/utils` for the `cn()` utility

**Note:** Some files use `@/` aliases while others use relative `./` paths (inconsistent). Pages in `App.tsx` use relative `./pages/` imports. Prefer `@/` aliases for all imports.

## Error Handling

**Patterns:**
- Try/catch blocks wrapping Supabase operations
- Errors logged with `console.error('Descriptive message:', err)`
- User-facing errors shown via toast notifications (two systems in use):
  - `useToast` hook from `@/hooks/use-toast` (Radix toast): used in pages like `src/pages/Dashboard.tsx`
  - `toast` from `sonner`: used in hooks like `src/hooks/useTimeEntries.ts`, `src/hooks/useProjects.ts`
- Supabase errors: destructure `error` from response, throw if present: `if (error) throw error`
- Catch blocks use `catch (err: any)` pattern with `err.message` access
- Guard clauses at function start for missing auth/company: `if (!company?.id) return;`
- No global error boundary detected

**Toast pattern for success:**
```typescript
toast({ title: "Clocked In", description: "You have successfully clocked in." });
```

**Toast pattern for errors:**
```typescript
toast({ title: "Clock In Failed", description: "Failed to clock in. Please try again.", variant: "destructive" });
```

**Sonner toast pattern (in hooks):**
```typescript
toast.success("Project created successfully");
toast.error("Failed to create project: " + error.message);
```

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- `console.error('Descriptive context:', error)` for caught errors
- No `console.log` or `console.warn` usage observed in production code
- No remote error reporting (no Sentry, LogRocket, etc.)

## Comments

**When to Comment:**
- Inline comments for non-obvious logic: `// Auto-assign "Other" task type if no task type selected`
- Section headers in JSX: `{/* Current Status Section */}`, `{/* Protected Routes */}`
- Brief explanations before async operations: `// Check for active time entry on mount`
- No JSDoc/TSDoc usage detected

## Function Design

**Size:** Pages can be large (500+ lines for `Dashboard.tsx`). Hooks are typically 30-130 lines. Components vary.

**Parameters:** Use destructured objects for component props. Hooks accept optional primitive params.

**Return Values:**
- Hooks return objects with named properties: `{ employees, loading, error, refetch, authenticatePin }`
- React Query hooks return query/mutation results directly
- Async functions return data or throw errors

## Module Design

**Exports:**
- Pages: `export default ComponentName` (default export)
- Hooks: `export const useHookName` (named export, multiple per file)
- Components: `export const ComponentName` (named export) or `export default`
- Contexts: Named exports for both Provider and hook: `export const AuthProvider`, `export const useAuth`

**Barrel Files:** Not used. Import directly from specific files.

## Component Patterns

**Page components:**
- Arrow function with default export
- Use `DashboardLayout` wrapper for authenticated pages
- Compose multiple hooks at the top of the component
- Local state with `useState` for UI state
- Direct Supabase calls in some pages (e.g., `Dashboard.tsx`) alongside hook-based data fetching

**Hook patterns (two styles coexist):**
1. **Manual hooks** (`useEmployees.ts`): `useState` + `useEffect` + direct Supabase calls, return `{ data, loading, error, refetch }`
2. **React Query hooks** (`useTimeEntries.ts`, `useProjects.ts`): `useQuery`/`useMutation` with Supabase, return TanStack Query results

**Prefer React Query hooks** for new code. Use `queryKey` arrays like `["entity-name", id]`.

**React Query mutation pattern:**
```typescript
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { company } = useCompany();

  return useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.from("table").insert({...}).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create project: " + error.message);
    },
  });
};
```

## Styling

**Framework:** Tailwind CSS with shadcn/ui components

**Patterns:**
- Use `cn()` from `@/lib/utils` for conditional class merging
- Tailwind utility classes inline in JSX
- Dark mode support via CSS variables and `dark:` variants
- Color tokens: `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-muted/50`
- Custom brand colors as hex: `bg-[#008000]`, `bg-[#4BA0F4]`
- shadcn base color: `slate`

---

*Convention analysis: 2026-01-27*
