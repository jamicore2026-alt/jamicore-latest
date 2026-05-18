$ErrorActionPreference = "Stop"

Write-Host "=== JamiCore Environment Setup ==="

Write-Host "Checking Node.js..."
node -v

Write-Host "Checking pnpm..."
pnpm -v

Write-Host "=== Installing dependencies ==="
pnpm install

Write-Host "=== Generating Prisma client ==="
pnpm db:generate

Write-Host "=== Running type checks ==="
pnpm typecheck

Write-Host "=== Running tests ==="
pnpm test

Write-Host "=== Building packages ==="
pnpm build

Write-Host "=== Environment ready ==="
