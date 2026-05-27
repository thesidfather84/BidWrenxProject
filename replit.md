# BidWrenx

A marketplace where car owners post automotive repair jobs and local mechanics bid on them — dark Uber/Stripe-style design.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/api-client-react/src/generated/` — generated hooks (do not edit)
- `lib/db/src/schema.ts` — database schema (users, jobs, bids, messages, ip_blocklist, admin_audit_log, login_history)
- `artifacts/api-server/src/routes/` — all API route handlers
  - `auth.ts` — login, register, PIN, public mechanic profile, referral
  - `admin.ts` — full admin CRUD: ban, delete, notes, IP blocklist, audit log, referral stats
  - `middlewares/checkIpBlocked.ts` — blocks banned IPs on auth routes
  - `lib/getIp.ts` — extracts client IP from request
- `artifacts/bidwrenx/src/` — React frontend
  - `pages/customer/` — customer dashboard, jobs, new job, job detail
  - `pages/mechanic/` — mechanic dashboard, browse jobs, job detail, my bids
  - `pages/mechanic-profile.tsx` — public mechanic profile with share/referral buttons
  - `pages/admin/index.tsx` — admin panel (overview, users, verification, jobs, reports, IP blocklist, audit log, referrals)
  - `pages/messages.tsx`, `pages/thread.tsx` — messaging
  - `pages/settings.tsx` — PIN management + referral section for mechanics
  - `components/layout.tsx` — AppLayout, PageHeader, StatCard, StatusBadge, etc.
  - `contexts/auth.tsx` — AuthProvider + useAuth hook
- `artifacts/bidwrenx/src/index.css` — dark theme CSS variables

## Architecture decisions

- **Contract-first API**: OpenAPI spec drives Orval codegen for React Query hooks + Zod schemas; server and client always stay in sync.
- **Token auth via localStorage**: `setAuthTokenGetter` wires `bidwrenx_token` into every API call automatically (main.tsx). The token is a base64-encoded HMAC signed string from `lib/auth.ts`.
- **AuthUser local interface**: Auth context defines its own `AuthUser` shape (not the generated `User` type) to avoid circular import issues with the codegen barrel.
- **Route ordering**: `/jobs/my` and `/bids/my` are declared *before* `/:id` in Express to avoid "my" being parsed as a numeric ID. Similarly `/users/me/referral` is before `/users/:id/profile`. `/mechanic/:id` public profile route is declared last in App.tsx to avoid matching mechanic sub-routes.
- **Dark-only theme**: `document.documentElement.classList.add("dark")` is set in `main.tsx`; the app only uses the `.dark` CSS variable set.
- **IP tracking**: All logins capture IP via `getClientIp()` → stored in `login_history` and `lastLoginIp`. `checkIpBlocked` middleware runs on `/api/auth/login`, `/api/auth/register`, `/api/auth/pin-login`.
- **Audit log**: Every admin action calls `logAdminAction()` which inserts into `admin_audit_log`. Fire-and-forget (errors don't fail the request).
- **Referral codes**: Auto-generated (8-char alphanumeric) for new mechanic registrations. Existing mechanics get one on first call to `GET /users/me/referral`. The code used to sign up is stored as `referredBy`.

## Product

- **Customers** post repair jobs (title, description, vehicle info, budget, location), view bids from mechanics, accept the best bid, and message mechanics.
- **Mechanics** browse open jobs by category/search, submit bids (price + days + note), track bid status, and message customers. Each mechanic has a public shareable profile page (`/mechanic/:id`) with badges, referral link, and social share buttons.
- **Messaging**: per-job threads between customer and mechanic with real-time polling (5s interval).
- **Dashboards**: role-specific stats (open jobs, bids received / active bids, etc.) with recent activity feeds.
- **Admin**: Full moderation panel — ban/unban, soft delete/restore, admin notes, user detail drawer (with reports + IP history), IP blocklist, audit log, referral stats, verification queue.

## Demo accounts (password: `password123`)

- Customers: `sarah@example.com`, `james@example.com`
- Mechanics: `mike@example.com` (★4.9), `david@example.com` (★4.7), `luis@example.com` (★4.5)
- Admins: `admin@bidwrenx.com`, `bidwrenx@gmail.com`

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes.
- Run `pnpm --filter @workspace/db run push` after schema changes (or use `executeSql` in code_execution for non-interactive migrations).
- Do not run `pnpm dev` at the workspace root — use `restart_workflow` for each artifact.
- `budgetMin`/`budgetMax` are optional floats; the DB stores them as `real` (nullable).
- Password hashing: SHA-256 of `password + "bidwrenx_salt"` (simple for demo; upgrade for production).
- Admin-only new endpoints (ban, delete, notes, IP blocklist, audit log, referrals) are NOT in the OpenAPI spec — they use direct `adminFetch()` calls in the admin panel with `useQuery` from `@tanstack/react-query`.
- The `banned` field on users blocks login immediately — checked in both `POST /auth/login` and `POST /auth/pin-login`. Banned users see a specific error message.
