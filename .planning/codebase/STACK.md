# Technology Stack

**Analysis Date:** 2026-01-27

## Languages

**Primary:**
- TypeScript 5.8.x - All frontend source (`src/`) and Supabase Edge Functions (`supabase/functions/`)

**Secondary:**
- SQL - Supabase migrations (`supabase/migrations/`)

## Runtime

**Frontend:**
- Browser (SPA) - Vite dev server on port 8080

**Backend:**
- Deno (Supabase Edge Functions) - All serverless functions in `supabase/functions/`

**Package Manager:**
- npm
- Lockfile: `package-lock.json` expected (standard npm)

## Frameworks

**Core:**
- React 18.3.x - UI framework (`src/`)
- React Router DOM 6.30.x - Client-side routing (`src/pages/`)
- TanStack React Query 5.83.x - Server state management and data fetching

**UI:**
- shadcn/ui (Radix UI primitives) - Component library (`src/components/ui/`)
- Tailwind CSS 3.4.x - Utility-first styling
- Lucide React 0.462.x - Icon library
- Recharts 2.15.x - Charting/data visualization
- cmdk 1.1.x - Command palette
- Embla Carousel React 8.6.x - Carousel component
- Vaul 0.9.x - Drawer component
- React Resizable Panels 2.1.x - Resizable panel layouts
- Sonner 1.7.x - Toast notifications
- next-themes 0.3.x - Dark/light mode theming

**Forms:**
- React Hook Form 7.61.x - Form state management
- Zod 3.25.x - Schema validation
- @hookform/resolvers 3.10.x - Zod-to-RHF bridge

**Build/Dev:**
- Vite 5.4.x - Build tool and dev server (`vite.config.ts`)
- @vitejs/plugin-react-swc 3.11.x - SWC-based React transform (faster than Babel)
- ESLint 9.32.x - Linting (`eslint.config.js`)
- PostCSS 8.5.x + Autoprefixer 10.4.x - CSS processing (`postcss.config.js`)
- lovable-tagger 1.1.x - Dev-only component tagging plugin (Lovable platform)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.87.x - Supabase client for auth, database, storage, edge functions
- `react-router-dom` 6.30.x - All page routing
- `@tanstack/react-query` 5.83.x - All async data fetching and caching

**Domain-Specific:**
- `mapbox-gl` 3.17.x - Map rendering for GPS/location features
- `qrcode` 1.5.x - QR code generation (badges)
- `qr-scanner` 1.4.x - QR code scanning (timeclock)
- `jspdf` 3.0.x + `jspdf-autotable` 5.0.x - PDF report generation
- `papaparse` 5.5.x - CSV parsing/export
- `file-saver` 2.0.x - Client-side file downloads
- `jszip` 3.10.x - ZIP file creation
- `html2canvas` 1.4.x - HTML-to-image capture
- `date-fns` 3.6.x - Date manipulation

**Styling Infrastructure:**
- `class-variance-authority` 0.7.x - Variant-based component styling (shadcn pattern)
- `clsx` 2.1.x - Conditional classname merging
- `tailwind-merge` 2.6.x - Tailwind class deduplication
- `tailwindcss-animate` 1.0.x - Animation utilities
- `@tailwindcss/typography` 0.5.x - Prose styling

## Configuration

**Environment:**
- `.env` at project root with `VITE_` prefixed vars (Vite convention)
- Required vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- Edge function secrets managed via Supabase Dashboard (not in `.env`)

**TypeScript:**
- `tsconfig.json` - Project references to `tsconfig.app.json` and `tsconfig.node.json`
- Path alias: `@/*` maps to `./src/*`
- Relaxed strict mode: `noImplicitAny: false`, `strictNullChecks: false`

**Build:**
- `vite.config.ts` - SWC React plugin, `@` path alias, port 8080
- `tailwind.config.ts` - Tailwind configuration
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer

## Platform Requirements

**Development:**
- Node.js (version not pinned, no `.nvmrc`)
- npm for package management
- Supabase CLI for edge function development

**Production:**
- Static SPA hosting (Vite build output)
- Supabase hosted backend (database, auth, edge functions, storage)

---

*Stack analysis: 2026-01-27*
