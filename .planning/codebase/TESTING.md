# Testing Patterns

**Analysis Date:** 2026-01-27

## Test Framework

**Runner:**
- No test framework is installed or configured
- No test runner detected (no Jest, Vitest, Playwright, Cypress, or Testing Library)
- No test scripts in `package.json`

**Assertion Library:**
- None

**Run Commands:**
```bash
# No test commands available
# package.json scripts: dev, build, build:dev, lint, preview
```

## Test File Organization

**Location:**
- No test files exist anywhere in the codebase
- No `*.test.*`, `*.spec.*`, or `__tests__/` directories found

**Naming:**
- No convention established

## Test Structure

**No tests exist.** The codebase has zero test coverage.

## Mocking

**Framework:** None installed

**Patterns:** None established

## Fixtures and Factories

**Test Data:** None

## Coverage

**Requirements:** None enforced
**Current coverage:** 0%

## Test Types

**Unit Tests:** Not implemented
**Integration Tests:** Not implemented
**E2E Tests:** Not implemented

## Recommendations for Adding Tests

Given the Vite + React + TypeScript stack, the recommended setup:

**Framework:** Vitest (native Vite integration)

**Install:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Config:** Add to `vite.config.ts`:
```typescript
/// <reference types="vitest" />
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

**Script:** Add to `package.json`:
```json
"test": "vitest",
"test:coverage": "vitest run --coverage"
```

**Priority areas to test first:**
1. Custom hooks with business logic: `src/hooks/useEmployees.ts`, `src/hooks/useTimeEntries.ts`
2. Utility functions: `src/utils/reportUtils.ts`, `src/utils/reportExportUtils.ts`, `src/utils/badgeUrlUtils.ts`
3. Context providers: `src/contexts/AuthContext.tsx`, `src/contexts/CompanyContext.tsx`
4. Complex page logic: `src/pages/Dashboard.tsx` (clock in/out flow)

**Test file placement:** Co-locate with source files:
- `src/hooks/useEmployees.test.ts`
- `src/utils/reportUtils.test.ts`
- `src/components/timeclock/PhotoCapture.test.tsx`

**Mocking Supabase:**
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      order: vi.fn(),
    })),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: { invoke: vi.fn() },
    storage: { from: vi.fn() },
  },
}));
```

---

*Testing analysis: 2026-01-27*
