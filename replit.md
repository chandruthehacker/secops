# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   ├── mockup-sandbox/     # Design mockup preview server
│   └── secops-console/     # SecOps Console SIEM frontend (main app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## SecOps Console (Main App)

**Location**: `artifacts/secops-console/`
**Preview path**: `/`
**Tech stack**: React 18 + Vite + TypeScript + Tailwind CSS (dark theme) + Zustand + Recharts

### Features
- SOC Dashboard with real-time charts (Recharts area/pie/bar charts)
- Logs Explorer with search, filtering, and sortable table of 250+ mock logs
- Alert Queue with status filtering and bulk management
- Alert Detail pages with timeline, AI summaries, and investigation tools
- Detection Rules engine with enable/disable toggles and rule builder
- MITRE ATT&CK Matrix visualization with coverage metrics
- Log Ingestion configuration panel
- Settings page

### Key Files
- `src/App.tsx` — Router setup (wouter)
- `src/components/layout/MainLayout.tsx` — Sidebar + top bar layout
- `src/lib/mockGenerator.ts` — Generates 250 logs and 65 alerts
- `src/lib/types.ts` — TypeScript type definitions
- `src/store/index.ts` — Zustand global state (alerts, logs, rules)
- `src/pages/` — All page components
- `src/components/ui/Badge.tsx` — SeverityBadge and StatusBadge components

### Color Theme (dark cybersecurity)
- Background: #0a0e1a (deep navy)
- Cards: #111827
- Borders: #1e3a5f
- Primary accent: #3b82f6 (blue)
- Critical: #ef4444, High: #f97316, Medium: #eab308, Low: #22c55e

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/`. 

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval codegen config.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
