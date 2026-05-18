# Project: JamiCore E-Commerce SaaS

## Session Log

### 2026-05-18 — Phase 1: Project scaffold and stack setup
- Created harness files (AGENTS.md, feature_list.json, progress.md, init.sh, init.ps1)
- Finalized tech stack with latest versions from Context7 + npm:
  - Next.js 16.2.6 (App Router)
  - Fastify 5.8.5
  - Prisma 7.8.0 with PrismaPg adapter
  - Tailwind CSS 4.3.0 (CSS-first config)
  - Auth.js 5.0.0-beta.31
  - React 19.2.6
- Built monorepo with pnpm workspaces + Turbo 2.9
- Created shared packages: `@jamicore/db`, `@jamicore/ui`, `@jamicore/auth`, `@jamicore/tsconfig`, `@jamicore/eslint-config`, `@jamicore/tailwind-config`
- Created applications: `apps/api` (Fastify), `apps/web` (Next.js)
- Set up Docker Compose with PostgreSQL 17 and Redis 7
- Set up GitHub Actions CI pipeline (lint, typecheck, test, build, migrate)
- Verified clean runs: install, db:generate, build, typecheck, test, lint all pass
- Pushed to GitHub, CI passing on `main`

### 2026-05-18 — Phase 2: Multi-tenancy core architecture
- Added `dbSchema` field to `Tenant` model for schema-per-tenant tracking
- Created initial Prisma migration (`20250518000000_init`) for platform schema
- Built `provisionTenant()` service that:
  - Creates tenant record in public schema
  - Creates dedicated PostgreSQL schema (`tenant_<slug>`)
  - Creates all e-commerce tables (User, Product, Category, Order) in tenant schema
- Built Fastify tenant context plugin (`plugins/tenant.ts`):
  - Resolves tenant from subdomain (`demo.localhost`) or `x-tenant-id` header
  - Attaches `request.tenant` and `request.tenantPrisma` for schema-scoped queries
  - Gracefully handles missing tenants and DB connection errors
- Added tenant-scoped API endpoint: `GET /api/v1/tenants/me/products`
- Added tenant provisioning endpoint: `POST /api/v1/tenants`
- All builds, typechecks, tests, lint pass clean

### 2026-05-18 — Phase 3: Authentication and authorization
- Updated `@jamicore/auth` package:
  - Replaced Prisma adapter with Credentials provider + JWT strategy
  - Added bcrypt password hashing (12 rounds)
  - Added zod validation for credentials
  - Extended NextAuth types with `role` field
  - Configured custom login/register pages
- Created Fastify auth plugin (`plugins/auth.ts`):
  - `@fastify/jwt` for token verification
  - `authenticate` decorator for route preHandler
  - `authUser` property on request with sub, email, name, role
- Created Fastify RBAC plugin (`plugins/rbac.ts`):
  - `requireRole(...roles)` decorator for role-based access control
- Created auth API routes (`routes/auth.ts`):
  - `POST /api/v1/auth/register` — register new user with hashed password
  - `POST /api/v1/auth/login` — validate credentials and return JWT
  - `GET /api/v1/auth/me` — get current authenticated user
- Protected tenant routes:
  - `POST /api/v1/tenants` → PLATFORM_ADMIN only
  - `GET /api/v1/tenants/me/products` → authenticated users
- Created Next.js pages:
  - `/login` — server action with Auth.js `signIn`
  - `/register` — client-side form calling API registration endpoint
- All builds, typechecks, tests, lint pass clean

## Next: Phase 4 — Product catalog and inventory
