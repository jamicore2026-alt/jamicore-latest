#!/bin/bash
set -e

echo "=== JamiCore Environment Setup ==="

# Verify Node.js version
echo "Checking Node.js..."
node -v

# Verify pnpm
echo "Checking pnpm..."
pnpm -v

# Install dependencies
echo "=== Installing dependencies ==="
pnpm install

# Run type checks
echo "=== Running type checks ==="
pnpm typecheck

# Run tests
echo "=== Running tests ==="
pnpm test

# Build all packages
echo "=== Building packages ==="
pnpm build

echo "=== Environment ready ==="
