# Security best-practices report

## Executive summary

The audit identified vulnerable local development tooling and a duplicate cross-package company contract. All dependency advisories are remediated in this branch, the Vite server is constrained to loopback access, and the web UI now uses the canonical `Company` contract.

## Resolved findings

### SEC-001 — Critical: vulnerable Vitest development server chain

- **Location:** workspace `package.json` files; lockfile resolution.
- **Evidence:** `vitest@2.1.9` resolved `vite@5.4.21`, which was affected by the Windows Vitest UI arbitrary file read/execute advisory.
- **Impact:** a developer who exposed Vitest UI could permit arbitrary file access and code execution.
- **Fix:** upgraded all workspaces to `vitest@^3.2.6`, which resolves to the patched Vitest/Vite/esbuild chain.

### SEC-002 — High: Vite Windows filesystem disclosure

- **Location:** `apps/web/package.json`, `apps/web/vite.config.ts`.
- **Evidence:** Vite 5.4.21 was vulnerable to the Windows alternate-path filesystem denial bypass.
- **Impact:** an exposed development server could disclose files such as `.env`.
- **Fix:** upgraded Vite to `^6.4.3`, bound the server to `127.0.0.1`, and retained strict filesystem controls at `apps/web/vite.config.ts:8`.

### SEC-003 — Low: demo databases were reachable on all host interfaces

- **Location:** `infra/docker-compose.yml:7`, `infra/docker-compose.yml:19`.
- **Evidence:** PostgreSQL and Neo4j used demo credentials and published ports without a loopback bind.
- **Impact:** another device on the same network could attempt to connect using known demo credentials.
- **Fix:** ports now bind only to `127.0.0.1`.

## Refactoring completed

- `packages/contracts/src/index.ts` is the shared `Company` contract.
- `CompaniesPage` adds only presentation metadata through `CompanyCard`, preventing UI fields from leaking into the API contract.

## Verification

- `pnpm audit --json`: 0 vulnerabilities.
- `pnpm --filter @cala/contracts typecheck`: passed.
- `pnpm --filter @cala/web build`: passed.

## Scope note

This checkout has no API or worker source files to audit. Entire code search shows those implementations live on separate branches; they should be merged or audited in their own integration branch before release.
