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
- **Auth**: JWT (access 15m + refresh 7d) via `jsonwebtoken`, bcrypt password hashing
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (auth, RBAC, full REST API)
│   ├── mockup-sandbox/     # Design mockup preview server
│   └── secops-console/     # SecOps Console SIEM frontend (main app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed-admin.ts   # Seeds 5 demo users (admin, alice, bob, diana, viewer)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## SecOps Console (Main App)

**Location**: `artifacts/secops-console/`
**Preview path**: `/`
**Tech stack**: React 18 + Vite + TypeScript + Tailwind CSS (dark theme) + Zustand + Recharts + Axios

### Features
- **Authentication**: JWT login, token refresh, logout — all backed by real API
- **RBAC**: Role-based UI gating + protected routes (admin/soc_l2/soc_l1/viewer)
- **SOC Dashboard** with real-time charts
- **Logs Explorer** with search, filtering, sortable table, CSV export
- **Alert Queue** with status filtering, bulk management
- **Alert Detail** with timeline, notes, assignment
- **Detection Rules** engine with YAML viewer
- **MITRE ATT&CK** matrix visualization
- **Log Ingestion** configuration panel
- **Settings** page (4 tabs)
- **User Management** (admin only) — create, edit role, activate/deactivate, reset password
- **Audit Logs** (admin only) — paginated log of all system actions

### Key Files
- `src/App.tsx` — Router with `ProtectedRoute` auth guards + role checks
- `src/components/layout/MainLayout.tsx` — Sidebar (role-gated nav) + header with real user
- `src/lib/api.ts` — Axios client with JWT interceptor + token refresh
- `src/store/authStore.ts` — Zustand auth store (login, logout, restoreSession, hasRole)
- `src/lib/mockGenerator.ts` — Generates 250 logs and 65 alerts for mock pages
- `src/store/index.ts` — Zustand state (alerts, logs, rules)
- `src/pages/LoginPage.tsx` — Login form with demo credential quick-fill
- `src/pages/UserManagementPage.tsx` — Admin user CRUD
- `src/pages/AuditLogPage.tsx` — Paginated audit trail
- `vite.config.ts` — Proxy `/api` → API server at port 8080

### Color Theme (dark cybersecurity)
- Background: #0a0e1a (deep navy)
- Cards: #111827
- Borders: #1e3a5f
- Primary accent: #3b82f6 (blue)
- Critical: #ef4444, High: #f97316, Medium: #eab308, Low: #22c55e

## API Server

**Location**: `artifacts/api-server/`
**Port**: 8080 (env: PORT)
**Base path**: `/api`

### Modules

```
src/
├── modules/
│   ├── auth/          — login, refresh, logout, /me
│   ├── users/         — CRUD + password reset (admin only)
│   ├── alerts/        — list, get, status update, assign, timeline notes
│   ├── rules/         — CRUD + enable/disable (admin/soc_l2)
│   ├── audit/         — paginated audit log read (admin only)
│   └── ingest/        — POST /ingest-log, GET /ingest/pending, POST /ingest/detections
├── middlewares/
│   ├── auth.middleware.ts  — JWT Bearer token validation
│   └── rbac.middleware.ts  — requireRole(), requireMinRole()
└── lib/
    ├── jwt.ts         — signAccessToken, signRefreshToken, verify*
    └── audit.ts       — logAuditEvent() helper
```

### Key API Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | /api/auth/login | Public (rate-limited 10/15min) |
| POST | /api/auth/refresh | Public |
| POST | /api/auth/logout | Any authenticated |
| GET  | /api/auth/me | Any authenticated |
| GET  | /api/users | Admin |
| POST | /api/users | Admin |
| PATCH | /api/users/:id | Admin |
| POST | /api/users/:id/reset-password | Admin |
| GET  | /api/alerts | SOC L1+ |
| PATCH | /api/alerts/:id/status | SOC L1+ |
| PATCH | /api/alerts/:id/assign | SOC L2+ |
| POST | /api/alerts/:id/timeline | SOC L1+ |
| GET  | /api/rules | SOC L1+ |
| POST | /api/rules | SOC L2+  |
| DELETE | /api/rules/:id | Admin |
| GET  | /api/audit | Admin |
| POST | /api/ingest-log | SOC L2+ |
| GET  | /api/ingest/pending | SOC L2+ |
| POST | /api/ingest/detections | SOC L2+ |

## Database Schema (`lib/db/`)

Tables: `users`, `alerts`, `alert_timeline`, `rules`, `incidents`, `audit_logs`, `raw_logs`

### Roles
- `admin` — Full control, user management, delete rules
- `soc_l2` — Investigate alerts, create/update rules, ingest logs
- `soc_l1` — View/triage alerts, add notes
- `viewer` — Read-only

### Demo Users (seeded via `scripts/src/seed-admin.ts`)
| Username | Role | Password |
|----------|------|----------|
| admin | Admin | Admin@SecOps1! |
| alice | SOC L2 | Analyst@1234! |
| bob | SOC L1 | Analyst@1234! |
| diana | SOC L2 | Analyst@1234! |
| viewer | Viewer | Viewer@1234! |

## Detection Engine Integration (Phase 3 Ready)

The backend has clean hooks prepared for a Python detection engine:
1. Ingest raw logs: `POST /api/ingest-log`
2. Poll unprocessed logs: `GET /api/ingest/pending`
3. Submit detections as alerts: `POST /api/ingest/detections`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/scripts run seed-admin` — seeds demo users into PostgreSQL
