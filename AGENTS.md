# Agent Instructions for JamiCore E-Commerce SaaS

## Project Overview
Multi-tenant e-commerce SaaS platform built with modern full-stack TypeScript.
Architecture: Modular monolith with clean separation between platform core and tenant storefronts.

## Startup Workflow
1. Read `feature_list.json` to understand current state
2. Read `progress.md` to see what was last done
3. If resuming: pick the in-progress feature and continue
4. If starting fresh: pick the top-priority planned feature
5. Run `./init.sh` to verify environment

## Definitions of Done
- Feature implementation passes type checks (`pnpm typecheck`)
- Feature implementation passes tests (`pnpm test`)
- Feature passes lint (`pnpm lint`)
- Feature builds successfully (`pnpm build`)
- `feature_list.json` updated with status `"done"` and evidence
- `progress.md` updated with what was built and any blockers
- No console errors or warnings in dev/build output

## Scope Rules
- One feature at a time. Do not start a second feature until the first is done.
- If you discover a bug in unrelated code, note it in `progress.md` but do not fix it now.
- Do not refactor unless the current feature requires it.
- Refer to Context7 for latest library documentation before implementing.
- Use pnpm workspace for monorepo management.

## Tech Stack (Pending Finalization)
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend/API:** Fastify, Prisma ORM, PostgreSQL, Redis
- **Auth:** Auth.js (NextAuth v5) or Clerk
- **DevOps:** GitHub Actions CI/CD, Docker, pnpm
- **Testing:** Vitest, Playwright
