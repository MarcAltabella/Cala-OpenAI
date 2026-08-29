ñ# Healthcare Market Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first dashboard that monitors an unlimited company watchlist, seeds ten biotech/healthcare companies, analyzes material healthcare developments, and produces cross-company market-impact reports.

**Architecture:** Express serves a React/Vite dashboard and starts durable LangGraph runs. PostgreSQL with pgvector is the source of truth for operational data and retrieval; Neo4j is rebuilt from approved PostgreSQL entities and relationships for graph exploration. LangChain/LangGraph is the sole agent framework.

**Tech Stack:** TypeScript, pnpm workspaces, React, Vite, Tailwind CSS, Express, React Flow (`@xyflow/react`), PostgreSQL 16 + pgvector, Neo4j, LangChain/LangGraph, Fastino Healthcare and Finance models, Cala Finance API, Docker Compose.

**Spec:** `planning.md`

## Global Constraints

- Follow `.agents/skills/software/git/pr-sca/SKILL.md`: one responsibility per PR, target under 200 net lines, and every PR must be safe to revert independently.
- Follow `.agents/skills/software/git/pr-description/SKILL.md`: conventional imperative lowercase commit/PR titles and `## What` / `## Why` bodies.
- Follow `.agents/skills/software/systems-design/flowcharts/SKILL.md`: use Mermaid `flowchart` syntax for every workflow diagram added to documentation.
- PostgreSQL is the source of truth; Neo4j is a rebuildable derived graph and is never written by HTTP routes.
- Support an unlimited company watchlist. Seed ten companies for the demo and pin Moderna first in the UI.
- Store the prior 12 months of source material on seed; daily runs retrieve deltas only.
- Run Fastino Finance only when Fastino Healthcare returns `relevanceScore >= 0.70`.
- Use live APIs: ClinicalTrials.gov, PubMed/PMC, FDA, DailyMed, SEC EDGAR, company IR/news feeds, and Cala.
- Keep the MVP local: Docker Compose, no auth, Redis, Supabase, managed database, or cloud scheduler.
- Use Tailwind CSS and native React/HTML components for all dashboard UI; do not add a component, chart, or dashboard library in MVP.
- Use React Flow (`@xyflow/react`) for the interactive knowledge-graph UI.

---

## Delivery map and ownership

| Stream | Owner | Starts after | Deliverable |
| --- | --- | --- | --- |
| Foundation | Any one developer | immediately | Workspace, containers, contracts, migrations |
| A — data/API | Developer 1 | Foundation | Postgres repositories and Express APIs |
| B — ingestion/agents/graph | Developer 2 | Foundation contracts | Source adapters, LangGraph, Neo4j projection |
| C — dashboard | Developer 3 | Foundation contracts | Companies, detail, graph, and reports UI |
| Integration | All | A, B, C | Seeded end-to-end demo flow |

```mermaid
flowchart TD
  A[Source APIs and feeds] --> B[Normalize and deduplicate]
  B --> C[(PostgreSQL)]
  C --> D[Healthcare analysis]
  D --> E{relevanceScore >= 0.70?}
  E -- No --> H[Finish development]
  E -- Yes --> F[Cala market history]
  F --> G[Finance analysis]
  G --> C
  C --> I[Project curated graph]
  I --> J[(Neo4j)]
  C --> K[Cross-company report]
```

## Shared file structure

```text
apps/
  api/src/{app.ts,index.ts,routes/*.ts}
  worker/src/{index.ts,graph.ts,scheduler.ts}
  web/src/{main.tsx,App.tsx,pages/*.tsx,lib/api.ts}
packages/
  contracts/src/index.ts
  db/src/{client.ts,schema.ts,repositories/*.ts,seed.ts}
  ingestion/src/{types.ts,normalize.ts,sources/*.ts}
  agents/src/{models.ts,healthcare.ts,finance.ts,workflow.ts}
  graph/src/{client.ts,project.ts,queries.ts}
infra/docker-compose.yml
```

## Task 1: Create the local workspace and containers

**Owner:** Foundation

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.env.example`
- Create: `infra/docker-compose.yml`
- Create: `apps/api/package.json`, `apps/worker/package.json`, `apps/web/package.json`
- Create: `packages/contracts/package.json`, `packages/db/package.json`, `packages/ingestion/package.json`, `packages/agents/package.json`, `packages/graph/package.json`

**Interfaces:**
- Produces workspace names `@cala/contracts`, `@cala/db`, `@cala/ingestion`, `@cala/agents`, and `@cala/graph`.
- Produces local service URLs `DATABASE_URL=postgresql://cala:cala@localhost:5432/cala`, `NEO4J_URI=bolt://localhost:7687`.

- [ ] **Step 1: Add a failing workspace check**

```json
{"scripts":{"typecheck":"pnpm -r typecheck"}}
```

- [ ] **Step 2: Run the check**

Run: `pnpm typecheck`

Expected: fail because workspace packages do not yet expose `typecheck`.

- [ ] **Step 3: Add minimal workspace manifests and Compose services**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
  neo4j:
    image: neo4j:5-community
```

- [ ] **Step 4: Verify local infrastructure**

Run: `docker compose -f infra/docker-compose.yml up -d postgres neo4j`

Expected: both containers report healthy/running.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .env.example infra apps packages
git commit -m "build: add local development workspace"
```

## Task 2: Define shared contracts and PostgreSQL schema

**Owner:** Foundation, then Developer 1 maintains it

**Files:**
- Create: `packages/contracts/src/index.ts`
- Create: `packages/db/src/schema.ts`, `packages/db/src/client.ts`, `packages/db/src/seed.ts`
- Test: `packages/db/src/schema.test.ts`

**Interfaces:**
- Produces `Company`, `SourceDocument`, `Development`, `FinanceAnalysis`, `AgentRun`, `DailyReport`, `GraphEntity`, and `GraphRelationship` types.
- `Development` includes `id`, `companyId`, `sourceDocumentId`, `summary`, `relevanceScore`, and `status`.
- `FinanceAnalysis` includes `developmentId`, `marketSnapshot`, `impact`, `confidence`, and `rationale`.

- [ ] **Step 1: Write the failing schema test**

```ts
it('enforces one source document per provider identifier', async () => {
  await insertSourceDocument({ provider: 'pubmed', providerId: '123', contentHash: 'a' });
  await expect(insertSourceDocument({ provider: 'pubmed', providerId: '123', contentHash: 'b' })).rejects.toThrow();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @cala/db test schema.test.ts`

Expected: fail because the schema and repository do not exist.

- [ ] **Step 3: Add migrations and typed contracts**

Create tables named in `planning.md`, enable `vector`, and enforce `UNIQUE(provider, provider_id)`. Seed ten companies in `seed.ts`; give Moderna `displayOrder: 0` and all others increasing orders.

- [ ] **Step 4: Run the test and migration**

Run: `pnpm --filter @cala/db test schema.test.ts && pnpm --filter @cala/db migrate && pnpm --filter @cala/db seed`

Expected: pass; ten companies exist and duplicate provider identifiers are rejected.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts packages/db
git commit -m "feat(data): define intelligence records"
```

## Task 3: Implement company and run APIs

**Owner:** Developer 1

**Files:**
- Create: `apps/api/src/app.ts`, `apps/api/src/index.ts`, `apps/api/src/routes/companies.ts`, `apps/api/src/routes/runs.ts`
- Create: `packages/db/src/repositories/companies.ts`, `packages/db/src/repositories/runs.ts`
- Test: `apps/api/src/routes/companies.test.ts`, `apps/api/src/routes/runs.test.ts`

**Interfaces:**
- `GET /companies` returns `Company[]` ordered by `displayOrder` then name.
- `POST /companies` accepts `{ name: string, ticker: string | null }` and creates any additional watchlist company.
- `POST /runs` accepts `{ companyId?: string, mode: 'seed' | 'delta' }` and returns `{ id, status: 'queued' }`.
- `GET /runs/:id` returns `{ id, status, startedAt, finishedAt, error, counts }`.

- [ ] **Step 1: Write failing endpoint tests**

```ts
it('queues a delta run without blocking', async () => {
  const response = await app.request('/runs', { method: 'POST', body: JSON.stringify({ mode: 'delta' }) });
  expect(response.status).toBe(202);
  expect(await response.json()).toMatchObject({ status: 'queued' });
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `pnpm --filter @cala/api test`

Expected: fail because the Express app has no routes.

- [ ] **Step 3: Implement the minimum routes and repositories**

The run route inserts the row and invokes the worker through a local `enqueueRun(runId)` function; it must not execute LangGraph within the request handler.

- [ ] **Step 4: Verify the contract**

Run: `pnpm --filter @cala/api test && pnpm --filter @cala/api typecheck`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api packages/db/src/repositories
git commit -m "feat(api): add companies and run endpoints"
```

## Task 4: Build source normalization and delta ingestion adapters

**Owner:** Developer 2

**Files:**
- Create: `packages/ingestion/src/types.ts`, `packages/ingestion/src/normalize.ts`
- Create: `packages/ingestion/src/sources/{clinical-trials,pubmed,fda,dailymed,sec,investor-relations}.ts`
- Test: `packages/ingestion/src/normalize.test.ts`, one `*.test.ts` per source adapter

**Interfaces:**

```ts
export type NormalizedDocument = {
  provider: string; providerId: string; companyId: string; url: string;
  publishedAt: Date; title: string; text: string; rawPayload: unknown; contentHash: string;
};
export interface SourceAdapter {
  fetch(company: Company, since: Date): Promise<NormalizedDocument[]>;
}
```

- [ ] **Step 1: Write the shared deduplication test**

```ts
it('creates the same hash for equivalent normalized content', () => {
  expect(contentHash('Title', 'Body')).toBe(contentHash('Title', 'Body'));
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @cala/ingestion test`

Expected: fail because `contentHash` is not defined.

- [ ] **Step 3: Implement the normalizer and adapters**

Every adapter must use a provider ID when available, set an explicit request timeout, return normalized documents, and throw a provider-scoped error that the workflow can record without aborting other providers.

- [ ] **Step 4: Verify each adapter with captured API fixtures**

Run: `pnpm --filter @cala/ingestion test && pnpm --filter @cala/ingestion typecheck`

Expected: pass without live provider keys.

- [ ] **Step 5: Commit one adapter per PR**

```bash
git add packages/ingestion/src/{types.ts,normalize.ts,clinical-trials.ts,clinical-trials.test.ts}
git commit -m "feat(ingestion): add clinical trials source"
```

Repeat with separate commits/PRs for PubMed, FDA, DailyMed, SEC, and investor-relations; do not combine provider adapters.

## Task 5: Implement the LangGraph healthcare-to-finance workflow

**Owner:** Developer 2

**Files:**
- Create: `packages/agents/src/models.ts`, `packages/agents/src/healthcare.ts`, `packages/agents/src/finance.ts`, `packages/agents/src/workflow.ts`
- Create: `apps/worker/src/index.ts`, `apps/worker/src/scheduler.ts`
- Test: `packages/agents/src/workflow.test.ts`

**Interfaces:**

```ts
export type WorkflowState = { runId: string; documentIds: string[]; developmentIds: string[]; financeAnalysisIds: string[]; errors: string[] };
export const RELEVANCE_THRESHOLD = 0.70;
export async function runIntelligenceWorkflow(runId: string): Promise<WorkflowState>;
```

- [ ] **Step 1: Write the threshold-routing test**

```ts
it('skips Cala and finance below the relevance threshold', async () => {
  const state = await runWithHealthcareScore(0.69);
  expect(state.financeAnalysisIds).toHaveLength(0);
  expect(calaClient.history).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @cala/agents test workflow.test.ts`

Expected: fail because no graph or routing node exists.

- [ ] **Step 3: Implement nodes and conditional edges**

Use a general model for structured extraction, Fastino Healthcare for `Development`, Cala for multi-year history, Fastino Finance for `FinanceAnalysis`, and a general model for report synthesis. Persist each node result and `agent_runs` status before moving to the next node.

- [ ] **Step 4: Add the daily scheduler and Run now bridge**

`enqueueRun(runId)` calls `runIntelligenceWorkflow(runId)`. `scheduler.ts` invokes a delta run once daily; the same function is used by the API route.

- [ ] **Step 5: Verify the workflow**

Run: `pnpm --filter @cala/agents test && pnpm --filter @cala/worker typecheck`

Expected: pass for low-score skip, qualifying finance call, and one failed provider with remaining providers completing.

- [ ] **Step 6: Commit**

```bash
git add packages/agents apps/worker
git commit -m "feat(agents): orchestrate healthcare and finance analysis"
```

## Task 6: Project curated relationships to Neo4j and expose graph reads

**Owner:** Developer 2

**Files:**
- Create: `packages/graph/src/client.ts`, `packages/graph/src/project.ts`, `packages/graph/src/queries.ts`
- Create: `apps/api/src/routes/knowledge-graph.ts`
- Test: `packages/graph/src/project.test.ts`, `apps/api/src/routes/knowledge-graph.test.ts`

**Interfaces:**

```ts
export async function projectDevelopment(developmentId: string): Promise<void>;
export async function companyNeighborhood(companyId: string): Promise<{ nodes: GraphEntity[]; edges: GraphRelationship[] }>;
```

- [ ] **Step 1: Write the idempotent projection test**

```ts
it('merges a company and development edge once', async () => {
  await projectDevelopment(developmentId);
  await projectDevelopment(developmentId);
  expect(await relationshipCount('DEVELOPED_BY')).toBe(1);
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @cala/graph test`

Expected: fail because the projection does not exist.

- [ ] **Step 3: Implement read-model projection and graph query**

Use Neo4j `MERGE` with PostgreSQL IDs as stable external IDs. Keep evidence URL, source document ID, and confidence on every relationship. `GET /knowledge-graph?companyId=` returns only serialized nodes and edges; no route accepts Cypher.

- [ ] **Step 4: Verify Neo4j behavior**

Run: `pnpm --filter @cala/graph test && pnpm --filter @cala/api test knowledge-graph.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/graph apps/api/src/routes/knowledge-graph.ts
git commit -m "feat(graph): project evidence relationships"
```

## Task 7: Build the dashboard shell and companies page

**Owner:** Developer 3

**Files:**
- Create: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/lib/api.ts`
- Create: `apps/web/src/pages/CompaniesPage.tsx`, `apps/web/src/components/AppNav.tsx`, `apps/web/src/components/RunNowButton.tsx`
- Test: `apps/web/src/pages/CompaniesPage.test.tsx`

**Interfaces:**
- `listCompanies(): Promise<Company[]>`
- `startRun(input: { companyId?: string; mode: 'seed' | 'delta' }): Promise<AgentRun>`

- [ ] **Step 1: Write the default-order test**

```tsx
it('shows Moderna before the remaining seeded companies', async () => {
  render(<CompaniesPage />);
  expect((await screen.findAllByRole('link'))[0]).toHaveTextContent('Moderna');
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @cala/web test CompaniesPage.test.tsx`

Expected: fail because the page does not exist.

- [ ] **Step 3: Implement navigation, company list, and Run now**

Use Tailwind CSS and native React/HTML components for the navigation, company list, and button. The Run now button starts `{ mode: 'delta' }`, shows its returned run status, and does not add settings/auth pages or a UI component library.

- [ ] **Step 4: Verify UI behavior**

Run: `pnpm --filter @cala/web test && pnpm --filter @cala/web typecheck`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add companies dashboard"
```

## Task 8: Build company detail, agent-run, and report pages

**Owner:** Developer 3

**Files:**
- Create: `apps/web/src/pages/CompanyDetailPage.tsx`, `apps/web/src/pages/ReportsPage.tsx`, `apps/web/src/pages/ReportDetailPage.tsx`
- Create: `apps/web/src/components/{DevelopmentList,AgentRunList,FinanceFindingCard}.tsx`
- Test: `apps/web/src/pages/CompanyDetailPage.test.tsx`, `apps/web/src/pages/ReportDetailPage.test.tsx`

**Interfaces:**
- `getCompany(id: string): Promise<Company>`
- `listDevelopments(companyId: string): Promise<Development[]>`
- `listAgentRuns(companyId: string): Promise<AgentRun[]>`
- `getReport(id: string): Promise<DailyReport>`

- [ ] **Step 1: Write the evidence-link test**

```tsx
it('links a finance finding to its source development', async () => {
  render(<CompanyDetailPage />);
  expect(await screen.findByRole('link', { name: /source development/i })).toHaveAttribute('href', '/companies/moderna');
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @cala/web test CompanyDetailPage.test.tsx`

Expected: fail because the detail page does not exist.

- [ ] **Step 3: Implement focused detail and report views**

Company detail must show source documents, developments, finance findings, and agent statuses/errors. Report detail must rank qualifying findings by impact and confidence and link every item to its company and evidence.

- [ ] **Step 4: Verify routes and tests**

Run: `pnpm --filter @cala/web test && pnpm --filter @cala/web typecheck`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): show company evidence and reports"
```

## Task 9: Build the knowledge graph page

**Owner:** Developer 3

**Files:**
- Create: `apps/web/src/pages/KnowledgeGraphPage.tsx`, `apps/web/src/components/KnowledgeGraph.tsx`
- Modify: `apps/web/src/lib/api.ts`
- Test: `apps/web/src/pages/KnowledgeGraphPage.test.tsx`

**Interfaces:**
- `getKnowledgeGraph(companyId?: string): Promise<{ nodes: GraphEntity[]; edges: GraphRelationship[] }>`

```mermaid
flowchart LR
  U[Company filter] --> A[GET /knowledge-graph]
  A --> B[Nodes and edges]
  B --> C[Graph renderer]
  C --> D[Selected node detail]
```

- [ ] **Step 1: Write the filter test**

```tsx
it('reloads the graph for the selected company', async () => {
  render(<KnowledgeGraphPage />);
  await userEvent.selectOptions(screen.getByLabelText('Company'), 'moderna');
  expect(mockGetKnowledgeGraph).toHaveBeenCalledWith('moderna');
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @cala/web test KnowledgeGraphPage.test.tsx`

Expected: fail because the graph page does not exist.

- [ ] **Step 3: Implement a small node/edge renderer**

Use React Flow (`@xyflow/react`) to render the API response, expose a company filter, and show node label, evidence URL, and confidence on selection. Do not add graph editing or natural-language Q&A.

- [ ] **Step 4: Verify the graph page**

Run: `pnpm --filter @cala/web test && pnpm --filter @cala/web typecheck`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): visualize knowledge graph"
```

## Task 10: Verify the seeded end-to-end demo path

**Owner:** All developers

**Files:**
- Create: `scripts/demo-check.ts`
- Modify: `README.md`
- Test: `scripts/demo-check.test.ts`

**Interfaces:**
- `demo-check` exits non-zero unless seed data, a qualifying development, Cala history, a finance analysis, a Neo4j relationship, and a daily report all exist.

- [ ] **Step 1: Write the failing end-to-end assertion**

```ts
expect(summary).toMatchObject({ companies: 10, developments: expect.any(Number), financeAnalyses: expect.any(Number), reports: 1, graphRelationships: expect.any(Number) });
```

- [ ] **Step 2: Run the check to verify failure**

Run: `pnpm demo-check`

Expected: fail until the demo seed and workflow have produced all artifacts.

- [ ] **Step 3: Implement the read-only demo check and runbook**

The README must document `docker compose up`, migrations, seeding, starting API/worker/web, pressing Run now, and the 2-minute Moderna narrative. The script must query stores only; it must not mutate them.

- [ ] **Step 4: Verify the full system**

Run: `pnpm typecheck && pnpm test && pnpm demo-check`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add scripts README.md
git commit -m "docs: add local demo runbook"
```

## PR sequence

1. `build: add local development workspace`
2. `feat(data): define intelligence records`
3. `feat(api): add companies and run endpoints`
4. Six independent source-adapter PRs
5. `feat(agents): orchestrate healthcare and finance analysis`
6. `feat(graph): project evidence relationships`
7. `feat(web): add companies dashboard`
8. `feat(web): show company evidence and reports`
9. `feat(web): visualize knowledge graph`
10. `docs: add local demo runbook`

Each PR description must use:

```markdown
## What

- <past-tense shipped outcome>

## Why

- <problem or decision>
```

## Self-review

- Scope coverage: all approved source providers, agent routing, PostgreSQL, Neo4j, local infrastructure, unlimited watchlists, three dashboard areas, and the demo report are assigned to tasks.
- Parallelization: Tasks 3, 4, and 7 can begin as soon as Task 2 lands; Tasks 5, 6, 8, and 9 then progress on their respective streams.
- No placeholders: every task declares files, interfaces, a focused test, runnable commands, and a commit.
