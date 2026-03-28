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
- **RBAC**: Role-based UI gating + protected routes (admin/soc_manager/detection_engineer/soc_l2/soc_l1/viewer)
- **SOC Dashboard** with real-time charts
- **Logs Explorer** with search, filtering, sortable table, CSV export
- **Alert Queue** with status filtering, bulk-update (single API call), inline assignment, row selection
- **Alert Detail** with 4 tabs: Context (MITRE, event fields, GeoIP), Investigation (notes, checklist), Timeline, Related Events (±10 min window)
- **Asset Inventory** — full CRUD (hostname, IP, OS, criticality, tags, owner, department); used for enrichment + risk scoring
- **Detection Rules** engine with YAML viewer + SIGMA-compatible rules
- **MITRE ATT&CK** matrix visualization
- **Log Ingestion** configuration panel
- **Settings** page (4 tabs)
- **User Management** (admin only) — create, edit role, activate/deactivate, reset password
- **Audit Logs** (admin only) — paginated log of all system actions
- **WebSocket real-time alerts** — header shows Live/Offline indicator; toast notification on new alerts

### Key Files
- `src/App.tsx` — Router with `ProtectedRoute` auth guards + role checks
- `src/components/layout/MainLayout.tsx` — Sidebar (role-gated nav) + header with WebSocket live indicator + real-time alert toasts
- `src/lib/api.ts` — Axios client with JWT interceptor + token refresh; all API modules (meApi, dashboardApi, logsApi, alertsApi, assetsApi, rulesApi) with DB normalizers
- `src/store/authStore.ts` — Zustand auth store with `isInitialized` flag (login, logout, restoreSession, hasRole, can)
- `src/pages/LoginPage.tsx` — Login form with demo credential quick-fill buttons
- `src/pages/DashboardPage.tsx` — Real API stats via /dashboard/stats
- `src/pages/AlertQueuePage.tsx` — Real alerts via TanStack Query, bulk-update via POST /alerts/bulk-update
- `src/pages/AlertDetailPage.tsx` — Tabbed UI (Context/Investigation/Timeline/Related Events), MITRE ATT&CK cards, GeoIP
- `src/pages/AssetsPage.tsx` — Asset Inventory CRUD with criticality badges and tag display
- `src/pages/SettingsPage.tsx` — Profile, notifications, API keys via /me endpoints
- `src/pages/UserManagementPage.tsx` — Admin user CRUD
- `src/pages/AuditLogPage.tsx` — Paginated audit trail
- `vite.config.ts` — Proxy `/api` → API server at port 8080; Proxy `/ws` → WebSocket at port 8080

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
├── app.ts             — Express app; trust proxy enabled for rate-limit X-Forwarded-For
├── index.ts           — http.createServer + WebSocket init + engine startup
├── modules/
│   ├── auth/          — login, refresh, logout, /me
│   ├── me/            — GET/PATCH /me, POST /me/password, /me/settings, /me/api-keys
│   ├── dashboard/     — GET /dashboard/stats (alert counts, trend data)
│   ├── users/         — CRUD + password reset (admin only)
│   ├── alerts/        — list, get, status update, assign, timeline notes, bulk-update, related-events
│   ├── assets/        — CRUD /assets (hostname, IP, OS, criticality, tags, owner, department)
│   ├── rules/         — CRUD + enable/disable + invalidates detection engine cache on change
│   ├── audit/         — paginated audit log read (admin only)
│   └── ingest/        — POST /ingest-log, GET /logs, GET /ingest/pending, POST /ingest/detections, POST /ingest/bulk
├── middlewares/
│   ├── auth.middleware.ts  — JWT Bearer token validation (export: requireAuth)
│   └── rbac.middleware.ts  — can() permission check
└── lib/
    ├── jwt.ts             — signAccessToken, signRefreshToken, verify*
    ├── audit.ts           — logAuditEvent() helper
    ├── websocket.ts       — WebSocketServer on /ws/alerts with heartbeat; broadcastAlert()
    ├── enrichment.ts      — GeoIP lookup (lazy) + asset cache; loadAssetCache()
    └── detection/
        ├── engine.ts      — Sigma-compatible YAML rule engine (|contains, |endswith, |re, threshold)
        ├── pipeline.ts    — processLogRecord(), processLogsBatch(); calls engine + creates alerts + broadcasts
        └── parsers/       — syslog, windows-eventlog, firewall, generic parsers
```

### Key API Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | /api/auth/login | Public | field: `identifier` (not `username`) |
| POST | /api/auth/refresh | Public | |
| GET  | /api/auth/me | Any authenticated | |
| GET  | /api/alerts | SOC L1+ | |
| PATCH | /api/alerts/:id/status | SOC L1+ | |
| PATCH | /api/alerts/:id/assign | SOC L2+ | |
| POST | /api/alerts/:id/timeline | SOC L1+ | |
| POST | /api/alerts/bulk-update | SOC L2+ | `{ids, status}` |
| GET  | /api/alerts/:id/related-events | SOC L1+ | `?minutesBefore=10&minutesAfter=5` |
| GET  | /api/assets | SOC L1+ | |
| POST | /api/assets | Det. Engineer+ | `rules:write` permission |
| PUT  | /api/assets/:id | Det. Engineer+ | |
| DELETE | /api/assets/:id | Admin | |
| GET  | /api/rules | SOC L1+ | |
| POST | /api/rules | Det. Engineer+ | |
| DELETE | /api/rules/:id | Admin | |
| GET  | /api/audit | Admin | |
| POST | /api/ingest-log | SOC L2+ | `{source, message?, rawData?, sourceIp?, hostname?}` |
| POST | /api/ingest/detections | SOC L2+ | Direct alert creation without running rules |
| POST | /api/ingest/bulk | SOC L2+ | `{logs: [...]}` |
| WS   | /ws/alerts | Any | WebSocket real-time alert feed |

## Database Schema (`lib/db/`)

Tables: `users`, `alerts`, `alert_timeline`, `rules`, `incidents`, `audit_logs`, `raw_logs`, `assets`

### Roles (5-level RBAC)
- `admin` — Full control, user management, delete rules
- `soc_manager` — Alert management, audit, ingest
- `detection_engineer` — Rules CRUD, ingest, asset management
- `soc_l2` — Investigate alerts, create/update rules, ingest logs
- `soc_l1` — View/triage alerts, add notes
- `viewer` — Read-only

### Demo Users
| Username | Role | Password |
|----------|------|----------|
| admin | Admin | Admin@SecOps1! |
| morgan | SOC Manager | Manager@1234! |
| elena | Detection Engineer | Engineer@1234! |
| alice | SOC L2 | Analyst@1234! |
| bob | SOC L1 | Analyst@1234! |
| viewer | Viewer | Viewer@1234! |

### Seeded Detection Rules (5 SIGMA-compatible YAML rules)
- DET-001: Brute Force Login — matches repeated EventID 4625 (T1110)
- DET-002: Suspicious PowerShell Encoded Command — EventID 4688 with encoded PS (T1059.001)
- DET-003: SSH Brute Force — syslog failed password threshold (T1110)
- DET-004: Firewall Port Scan — multiple firewall blocks from same IP (T1046)
- DET-005: PsExec Lateral Movement — PSEXESVC service name detection (T1021.002)

### Seeded Assets (6 assets for enrichment)
DC01, WEB01, APP02, WS042 (windows), FW01 (network), DB01 (linux)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/scripts run seed-admin` — seeds demo users into PostgreSQL
