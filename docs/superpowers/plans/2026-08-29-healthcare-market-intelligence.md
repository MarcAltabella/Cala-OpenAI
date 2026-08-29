# Healthcare World Knowledge Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first dashboard whose center is a healthcare-world knowledge graph. `POST /runs` fans out Cala healthcare intel and an OpenAI research agent in parallel, persists PostgreSQL then Neo4j, gates with Fastino Healthcare on Hugging Face, and only then calls Cala finance plus Fastino Finance for structured impact. Seed twenty companies with Moderna first. Demo: Moderna mRNA melanoma vaccine momentum.

**Architecture:** Express queues runs. LangGraph owns parallelism and the healthcare gate. PostgreSQL with pgvector is the source of truth, accessed through Drizzle ORM; Neo4j is projected after Postgres writes. Fastino models are Hugging Face Inference clients, not local weights.

**Tech Stack:** TypeScript, pnpm workspaces, React, Vite, Tailwind CSS, Express, React Flow (`@xyflow/react`), PostgreSQL 16 + pgvector, Drizzle ORM, Neo4j, LangChain/LangGraph, OpenAI (chat, tools, embeddings), Fastino Healthcare and Finance via Hugging Face Inference, Cala healthcare and finance APIs, Docker Compose.

**Spec:** `planning.md`

## Global Constraints

- Follow `.agents/skills/software/git/pr-sca/SKILL.md`: one responsibility per PR, target under 200 net lines, and every PR must be safe to revert independently.
- Follow `.agents/skills/software/git/pr-description/SKILL.md`: conventional imperative lowercase commit/PR titles and `## What` / `## Why` bodies.
- Follow `.agents/skills/software/systems-design/flowcharts/SKILL.md`: use Mermaid `flowchart` syntax for every workflow diagram added to documentation.
- PostgreSQL is the source of truth; Neo4j is a rebuildable derived graph and is never written by HTTP routes.
- Support an unlimited company watchlist. Seed **twenty** healthcare companies for the demo and pin Moderna first in the UI.
- Graph nodes are first-class: Company, Person, Institution, Paper, Patent, ClinicalTrial, NewsItem. Do not model papers, patents, or people only as fields on a company row.
- People and institutions come from structured source fields and extraction, not LinkedIn or campus crawls.
- Store the prior 12 months of source material on seed (extend lookback for patents/papers needed for the Moderna narrative); daily runs retrieve deltas only.
- Run Fastino Finance and Cala **finance** only when Fastino Healthcare returns `isNew && isRelevant`.
- Call Fastino Healthcare and Finance through Hugging Face Inference ([Healthcare](https://huggingface.co/fastino/Fastino-Nemotron-3.5-Lightning-Healthcare), [Finance](https://huggingface.co/fastino/Fastino-Nemotron-3.5-Lightning-Finance)); do not serve those weights in Compose.
- Use OpenAI for the research agent (tool calling), relation extract, JSON repair, and embeddings.
- Cala healthcare snapshot runs **in parallel** with the research agent on every run; it is not gated.
- Research tools wrap source adapters and may change; keep one adapter per PR.
- Use live APIs: ClinicalTrials.gov, PubMed/PMC, PatentsView (or equivalent USPTO API), FDA, DailyMed, SEC EDGAR, company IR/news, Tavily web news (snippets only), healthcare news feeds, Cala, OpenAI, and Hugging Face.
- Fastino Healthcare is a gate over stored evidence only; it must not call web search. Open-web news is a research adapter (`web_news`).
- Keep the MVP local: Docker Compose, no auth, Redis, Supabase, managed database, or cloud scheduler.
- Use Tailwind CSS and native React/HTML components for all dashboard UI; do not add a component, chart, or dashboard library in MVP.
- Use React Flow (`@xyflow/react`) for the interactive knowledge-graph UI.
- No HTTP route accepts Cypher.

---

## Delivery map and ownership

| Stream | Owner | Starts after | Deliverable |
| --- | --- | --- | --- |
| Foundation | Any one developer | immediately | Workspace, containers, contracts, migrations |
| A — data/API | Developer 1 | Foundation | Run queue, snapshot/gate/finance persistence, directory APIs |
| B — ingestion/agents/graph | Developer 2 | Foundation contracts | Adapters-as-tools, LangGraph fan-out, Fastino clients, Neo4j projection |
| C — dashboard | Developer 3 | Foundation contracts | Graph explorer, entity pages, momentum reports UI |
| Integration | All | A, B, C | Seeded Moderna momentum demo |

```mermaid
flowchart TD
  R[POST /runs] --> P[Fan-out]
  P --> C[Cala healthcare]
  P --> A[OpenAI research agent]
  A --> PG[(PostgreSQL)]
  PG --> NJ[(Neo4j)]
  C --> J[Join]
  NJ --> J
  J --> Rel[OpenAI relations]
  Rel --> FH[Fastino Healthcare HF]
  FH --> G{isNew and isRelevant}
  G -- No --> S[Stop]
  G -- Yes --> CF[Cala finance]
  CF --> FF[Fastino Finance HF]
```

## Shared file structure

```text
apps/
  api/src/{app.ts,index.ts,routes/*.ts}
  worker/src/{index.ts,scheduler.ts}
  web/src/{main.tsx,App.tsx,pages/*.tsx,lib/api.ts}
packages/
  contracts/src/index.ts
  db/src/{client.ts,schema.ts,repositories/*.ts,seed.ts}
  ingestion/src/{types.ts,normalize.ts,sources/*.ts}
  agents/src/{models.ts,cala.ts,fastino.ts,tools.ts,research.ts,relations.ts,healthcare.ts,finance.ts,workflow.ts,deps.ts}
  graph/src/{client.ts,project.ts,queries.ts}
scripts/run-moderna.ts
infra/docker-compose.yml
```

**Dependency injection:** `runIntelligenceWorkflow(runId, deps)` takes `deps = { cala, fastino, openai, repos, graph, tools }`. Defaults wire real implementations; tests pass mocks plus in-memory repos so the pipeline is verifiable without Postgres, Neo4j, or live API keys.

**External services behind interfaces:**
- `CalaClient` → `HttpCalaClient` (real `POST https://api.cala.ai/v1/knowledge/query`, `X-API-KEY`) and `MockCalaClient`. Healthcare vs finance are two query strings against the same `query(input)` method.
- `FastinoClient` → `OpenAIFastinoClient` (OpenAI-backed now, structured JSON validated with zod) and `MockFastinoClient`. Swap to a real Fastino Hugging Face endpoint later without changing the run graph.

## Task 1: Create the local workspace and containers

**Owner:** Foundation

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.env.example` (`OPENAI_API_KEY`, `HF_TOKEN`, `CALA_*`, Fastino model ids)
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
- Create: `packages/db/src/schema.ts`, `packages/db/src/client.ts`, `packages/db/src/seed.ts`, `packages/db/drizzle.config.ts`, `packages/db/drizzle/`
- Test: `packages/db/src/schema.test.ts`

**Interfaces:**
- Produces `Company`, `Person`, `Institution`, `SourceDocument`, `Entity`, `Relationship`, `CalaEntity`, `CalaSnapshot`, `HealthcareGate`, `Development`, `ExpectedImpact`, `FinanceImpact`, `RelationPack`, `MomentumReport`, `AgentRun`, `DailyReport` types.
- `Entity` includes `id`, `type` (`company` | `person` | `institution` | `paper` | `patent` | `clinical_trial` | `news`), `externalId`, `label`, and `properties`.
- `Relationship` includes `id`, `type`, `fromEntityId`, `toEntityId`, `sourceDocumentId`, `evidenceUrl`, and `confidence`.
- `CalaEntity` includes `id`, `entityType`, `name`, and `mentions`; `CalaSnapshot` includes `id`, `companyId`, `kind` (`healthcare` | `finance`), `input`, `entities`, `results`, and `createdAt`.
- `HealthcareGate` includes `isNew`, `isRelevant`, `relevanceScore`, `rationale`, `developmentSummary`.
- `ExpectedImpact` includes `direction` (`up` | `down` | `unclear`), `magnitude` (`low` | `medium` | `high`), `horizon`, `confidence`.
- `FinanceImpact` includes `developmentSummary`, `potentialProductOrCatalyst`, `expectedImpact`, `rationale`, `evidenceIds`.
- `AgentRun` includes `id`, `companyId`, `mode`, `status`, `phase` (`queued` | `fanout` | `relations` | `healthcare_gate` | `stopped` | `finance` | `completed` | `failed`), `error`, `counts`.
- `MomentumReport` includes `companyId`, `thesis`, `events` (ordered precursor list with entity ids), `generatedAt`.

- [ ] **Step 1: Write the failing schema test**

```ts
it('enforces one source document per provider identifier', async () => {
  await insertSourceDocument({ provider: 'pubmed', providerId: '123', contentHash: 'a' });
  await expect(insertSourceDocument({ provider: 'pubmed', providerId: '123', contentHash: 'b' })).rejects.toThrow();
});

it('rejects duplicate entity external ids of the same type', async () => {
  await insertEntity({ type: 'patent', externalId: 'US-1' });
  await expect(insertEntity({ type: 'patent', externalId: 'US-1' })).rejects.toThrow();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @cala/db test schema.test.ts`

Expected: fail because the schema and repository do not exist.

- [ ] **Step 3: Add the Drizzle schema, generated migrations, and typed contracts**

Define the tables named in `planning.md` with Drizzle's typed PostgreSQL schema, enable `vector` through a generated migration, and enforce `UNIQUE(provider, provider_id)` on documents and `UNIQUE(type, external_id)` on entities. Include the run-graph tables `cala_snapshots` (with a `kind` column for healthcare vs finance), `healthcare_gates`, and `finance_impacts`. Use Drizzle's migration runner and insert API in `client.ts` and `seed.ts`. Seed twenty companies; give Moderna `displayOrder: 0` and all others increasing orders. Do not hand-author runtime SQL queries or duplicate the schema in a SQL statement array.

- [ ] **Step 4: Run the test and migration**

Run: `pnpm --filter @cala/db test schema.test.ts && pnpm --filter @cala/db migrate && pnpm --filter @cala/db seed`

Expected: pass; twenty companies exist; duplicate provider identifiers and entity external ids are rejected.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts packages/db
git commit -m "feat(data): define healthcare graph records"
```

## Task 3: Implement directory, run queue, and analysis persistence

**Owner:** Developer 1

Developer 1 does **not** call Cala, OpenAI, or Fastino. Developer 1 owns HTTP contracts and PostgreSQL writes/reads the worker needs.

**Files:**
- Create: `apps/api/src/app.ts`, `apps/api/src/index.ts`
- Create: `apps/api/src/routes/{companies,people,institutions,runs,reports,knowledge-graph}.ts`
- Create: `packages/db/src/repositories/{companies,people,institutions,runs,reports,entities,snapshots,gates,finance-impacts}.ts`
- Test: `apps/api/src/routes/{companies,runs,reports}.test.ts`

**Interfaces:**
- `GET /companies` returns `Company[]` ordered by `displayOrder` then name.
- `POST /companies` accepts `{ name: string, ticker: string | null }` and creates any additional watchlist company.
- `GET /companies/:id/timeline` returns mixed events (papers, patents, trials, news, filings) ordered by date.
- `GET /companies/:id/people` returns `Person[]` linked by `WORKS_AT` / extraction edges.
- `GET /people/:id` and `GET /institutions/:id` return the entity plus neighborhood summary.
- `POST /runs` accepts `{ companyId: string, mode: 'seed' | 'delta' }` and returns `{ id, status: 'queued' }` with HTTP 202.
- `GET /runs/:id` returns `{ id, status, phase, startedAt, finishedAt, error, counts }` where `counts` includes cala healthcare, documents, gate, and finance.
- Repositories the worker calls: insert/update `source_documents`, `entities`, `relationships`, `cala_snapshots`, `healthcare_gates`, `finance_impacts`.
- `GET /knowledge-graph?companyId=&types=&personId=&institutionId=` returns serialized nodes and edges from the Neo4j read model via `packages/graph` `neighborhood`; no route accepts Cypher.
- `GET /reports/momentum/:companyId` returns the latest `MomentumReport` or 404.
- `GET /companies/:id/developments` returns the latest `HealthcareGate` / development for that company.

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

Split if the diff exceeds PR-SCA: companies+runs first, then people/institutions/timeline, then momentum report read.

```bash
git add apps/api packages/db/src/repositories
git commit -m "feat(api): add directory timeline and run endpoints"
```

## Task 4: Build source adapters that the research agent calls as tools

**Owner:** Developer 2

Adapters are the **tools** behind the OpenAI research agent. Tool names may change later; each adapter remains its own PR. **Shipped on this branch:** PubMed, ClinicalTrials, news/IR, and Tavily `web_news`. Patents, FDA, DailyMed, and SEC remain deferred. Research still executes tools sequentially in `runResearch`; Fastino Healthcare has no search tool.

**Files:**
- Create: `packages/ingestion/src/types.ts`, `packages/ingestion/src/normalize.ts`
- Create: `packages/ingestion/src/sources/{pubmed,clinical-trials,news,web-news}.ts`
- Create: `packages/agents/src/tools.ts` (thin wrappers; add as adapters land)
- Test: `packages/ingestion/src/normalize.test.ts`, one `*.test.ts` per source adapter (captured JSON fixtures)

**Interfaces:**

```ts
export type NormalizedDocument = {
  provider: string; providerId: string; companyId: string | null; url: string;
  publishedAt: Date; title: string; text: string; rawPayload: unknown; contentHash: string;
  documentKind: 'paper' | 'patent' | 'trial' | 'news' | 'filing' | 'label' | 'press';
};
export interface SourceAdapter {
  fetch(company: Company, since: Date): Promise<NormalizedDocument[]>;
}
```

Company-scoped fetch is the default. PubMed and news adapters may return documents whose primary subject is a person or institution; `companyId` may be null until linking.

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

Every adapter must use a provider ID when available (PMID, NCT id, article id), set an explicit request timeout, return normalized documents, and throw a provider-scoped error that the workflow can record without aborting other providers.

- [ ] **Step 4: Verify each adapter with captured API fixtures**

Run: `pnpm --filter @cala/ingestion test && pnpm --filter @cala/ingestion typecheck`

Expected: pass without live provider keys.

- [ ] **Step 5: Commit one adapter per PR**

```bash
git add packages/ingestion/src/{types.ts,normalize.ts,sources/clinical-trials.ts,sources/clinical-trials.test.ts}
git commit -m "feat(ingestion): add clinical trials source"
```

Repeat with separate commits/PRs for PubMed, news/IR, and Tavily `web_news`. Patents, FDA, DailyMed, and SEC are deferred; do not combine provider adapters.

## Task 5: Implement the LangGraph run: fan-out, gate, optional finance

**Owner:** Developer 2

**Files:**
- Create: `packages/agents/src/models.ts` (OpenAI chat + embeddings, env), `packages/agents/src/cala.ts` (`CalaClient`, `HttpCalaClient`, `MockCalaClient`; `healthcareQuery`/`financeQuery` builders), `packages/agents/src/fastino.ts` (`FastinoClient`, `OpenAIFastinoClient`, `MockFastinoClient`; zod schemas), `packages/agents/src/research.ts`, `packages/agents/src/relations.ts`, `packages/agents/src/healthcare.ts`, `packages/agents/src/finance.ts`, `packages/agents/src/workflow.ts`, `packages/agents/src/deps.ts` (default wiring)
- Create: `apps/worker/src/index.ts`, `apps/worker/src/scheduler.ts`
- Test: `packages/agents/src/workflow.test.ts`, `packages/agents/src/fastino.test.ts`

**Interfaces:**

```ts
export type WorkflowState = {
  runId: string;
  companyId: string;
  calaHealthcareSnapshotId: string | null;
  documentIds: string[];
  entityIds: string[];
  relationshipIds: string[];
  healthcareGate: HealthcareGate | null;
  calaFinanceSnapshotId: string | null;
  financeImpactId: string | null;
  errors: string[];
};
export type WorkflowDeps = { cala: CalaClient; fastino: FastinoClient; openai: OpenAIClient; repos: Repositories; graph: GraphProjector; tools: ResearchTool[] };
export async function runIntelligenceWorkflow(runId: string, deps?: Partial<WorkflowDeps>): Promise<WorkflowState>;
```

Nodes: **fan-out** (Cala healthcare ∥ OpenAI research agent + tools → Postgres → Neo4j project) → **join** → OpenAI relation pack → `FastinoClient.healthcareGate` → if `isNew && isRelevant` then Cala finance → `FastinoClient.financeImpact` structured `FinanceImpact`; else persist gate and stop with `phase = stopped`.

OpenAI embeddings run inside the research path via `embed_and_upsert`. Merge on `(type, externalId)` when present. Every external service is injected via `deps`, so tests run with `MockCalaClient`, `MockFastinoClient`, in-memory repos, and a fake graph projector.

- [ ] **Step 1: Write failing routing tests**

```ts
it('runs Cala healthcare and research in parallel and does not call Cala finance before the gate', async () => {
  const deps = mockDeps();
  await runIntelligenceWorkflow(runId, deps);
  expect(deps.cala.healthcareCalls).toBe(1);
  expect(deps.cala.financeCalls).toBe(0);
});

it('stops without Cala finance when Fastino Healthcare returns not new or not relevant', async () => {
  const deps = mockDeps({ gate: { isNew: true, isRelevant: false } });
  const state = await runIntelligenceWorkflow(runId, deps);
  expect(state.financeImpactId).toBeNull();
  expect(deps.cala.financeCalls).toBe(0);
});

it('calls Cala finance and Fastino Finance when the gate is new and relevant', async () => {
  const deps = mockDeps({ gate: { isNew: true, isRelevant: true } });
  const state = await runIntelligenceWorkflow(runId, deps);
  expect(deps.cala.financeCalls).toBe(1);
  expect(state.financeImpactId).toBeTruthy();
});

it('records a failing research tool without aborting the Cala branch', async () => {
  const deps = mockDeps({ failingTool: 'pubmed' });
  const state = await runIntelligenceWorkflow(runId, deps);
  expect(state.errors.some((e) => e.includes('pubmed'))).toBe(true);
  expect(deps.cala.healthcareCalls).toBe(1);
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `pnpm --filter @cala/agents test`

Expected: fail because the graph and clients do not exist.

- [ ] **Step 3: Implement nodes and conditional edges**

Use OpenAI for research tools and the relation pack. Call Fastino through the injected `FastinoClient` (OpenAI-backed now via `OpenAIFastinoClient`, swappable for a real Hugging Face endpoint). Persist each node via repositories and update `agent_runs.phase` before the next node. A failed research tool is recorded in `errors` and does not abort the Cala healthcare branch.

- [ ] **Step 4: Add the daily scheduler and Run now bridge**

`enqueueRun(runId)` calls `runIntelligenceWorkflow(runId)` with default deps. `scheduler.ts` enqueues a delta run once daily; the API route uses the same function.

- [ ] **Step 5: Verify the workflow**

Run: `pnpm --filter @cala/agents test && pnpm --filter @cala/worker typecheck`

Expected: pass for parallel fan-out, stop-on-gate, finance path, and one failed tool with the Cala branch completing.

- [ ] **Step 6: Commit**

Split if needed: Cala + Fastino clients, then research agent, then workflow.

```bash
git add packages/agents apps/worker
git commit -m "feat(agents): fan out research and gate finance analysis"
```

## Task 6: Project curated relationships to Neo4j and expose graph reads

**Owner:** Developer 2

**Files:**
- Create: `packages/graph/src/client.ts` (neo4j driver factory + in-memory fake for tests), `packages/graph/src/project.ts`, `packages/graph/src/queries.ts`
- Test: `packages/graph/src/project.test.ts`

**Interfaces:**

```ts
export async function projectEntity(entityId: string): Promise<void>;
export async function projectRelationship(relationshipId: string): Promise<void>;
export async function neighborhood(input: {
  companyId?: string; personId?: string; institutionId?: string; types?: string[];
}): Promise<{ nodes: Entity[]; edges: Relationship[] }>;
```

- [ ] **Step 1: Write the idempotent projection test (fake driver)**

```ts
it('merges the same relationship once', async () => {
  await projectRelationship(edgeId);
  await projectRelationship(edgeId);
  expect(await relationshipCount('DEVELOPED_BY')).toBe(1);
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @cala/graph test`

Expected: fail because the projection does not exist.

- [ ] **Step 3: Implement read-model projection and graph query**

The research path projects **before** the relation step so the gate sees PostgreSQL and Neo4j. Use Neo4j `MERGE` with PostgreSQL IDs as stable external IDs. Keep evidence URL, source document ID, and confidence on every relationship. Unit tests run against the in-memory fake driver; an optional integration test is gated on `NEO4J_URI`. The `GET /knowledge-graph` HTTP route is Developer 1's; Developer 2 owns `project.ts` and `queries.ts`. No route accepts Cypher.

- [ ] **Step 4: Verify Neo4j behavior**

Run: `pnpm --filter @cala/graph test && pnpm --filter @cala/graph typecheck`

Expected: pass (fake driver); integration test skipped unless `NEO4J_URI` is set.

- [ ] **Step 5: Commit**

```bash
git add packages/graph
git commit -m "feat(graph): project healthcare world relationships"
```

## Task 6b: Wire the worker and a live Moderna demo

**Owner:** Developer 2

**Files:**
- Create: `apps/worker/src/index.ts` (`enqueueRun(runId)` runs `runIntelligenceWorkflow` fire-and-forget, updating `agent_runs.phase`/`status`), `apps/worker/src/scheduler.ts` (minimal daily delta)
- Modify: `apps/api/src/routes/runs.ts` — bind the route's `enqueueRun` to the worker at app startup; keep the no-op stub for existing API tests.
- Create: `scripts/run-moderna.ts` — live end-to-end run for Moderna, gated on real `OPENAI_API_KEY` and `CALA_API_KEY`; not part of `pnpm test`.

- [ ] **Step 1:** Wire `enqueueRun`; verify `pnpm --filter @cala/worker typecheck && pnpm --filter @cala/api test`.
- [ ] **Step 2:** Run `pnpm typecheck && pnpm test` (mock-backed suite, no live keys).
- [ ] **Step 3:** Optional: `docker compose -f infra/docker-compose.yml up -d`, then `pnpm tsx scripts/run-moderna.ts` to eyeball the gate and finance output.
- [ ] **Step 4:** Commit `feat(worker): run intelligence workflow on enqueue`.

## Task 7: Build the graph explorer shell

**Owner:** Developer 3

**Files:**
- Create: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/lib/api.ts`
- Create: `apps/web/src/pages/KnowledgeGraphPage.tsx`, `apps/web/src/components/KnowledgeGraph.tsx`, `apps/web/src/components/AppNav.tsx`, `apps/web/src/components/RunNowButton.tsx`
- Test: `apps/web/src/pages/KnowledgeGraphPage.test.tsx`

**Interfaces:**
- `getKnowledgeGraph(filters: { companyId?: string; types?: string[] }): Promise<{ nodes: Entity[]; edges: Relationship[] }>`
- `startRun(input: { companyId?: string; mode: 'seed' | 'delta' }): Promise<AgentRun>`

The knowledge graph page is the default route (`/`).

```mermaid
flowchart LR
  U[Type and company filter] --> A[GET /knowledge-graph]
  A --> B[Nodes and edges]
  B --> C[Graph renderer]
  C --> D[Selected node detail]
```

- [ ] **Step 1: Write the filter test**

```tsx
it('reloads the graph for Moderna and papers', async () => {
  render(<KnowledgeGraphPage />);
  await userEvent.selectOptions(screen.getByLabelText('Company'), 'moderna');
  await userEvent.click(screen.getByLabelText('Papers'));
  expect(mockGetKnowledgeGraph).toHaveBeenCalledWith({ companyId: 'moderna', types: expect.arrayContaining(['paper']) });
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @cala/web test KnowledgeGraphPage.test.tsx`

Expected: fail because the page does not exist.

- [ ] **Step 3: Implement navigation, graph renderer, and Run now**

Use React Flow to render the API response. On selection show node label, type, evidence URL, and confidence. Do not add graph editing or natural-language Q&A. Run now starts `{ mode: 'delta' }` and shows returned run status.

- [ ] **Step 4: Verify UI behavior**

Run: `pnpm --filter @cala/web test && pnpm --filter @cala/web typecheck`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): add healthcare knowledge graph explorer"
```

## Task 8: Build company, person, and institution pages

**Owner:** Developer 3

**Files:**
- Create: `apps/web/src/pages/{CompaniesPage,CompanyDetailPage,PersonPage,InstitutionPage}.tsx`
- Create: `apps/web/src/components/{Timeline,PersonList,DevelopmentList,AgentRunList}.tsx`
- Test: `apps/web/src/pages/CompaniesPage.test.tsx`, `apps/web/src/pages/CompanyDetailPage.test.tsx`

**Interfaces:**
- `listCompanies(): Promise<Company[]>`
- `getCompanyTimeline(id: string): Promise<TimelineEvent[]>`
- `getPerson(id: string): Promise<Person>`
- `getInstitution(id: string): Promise<Institution>`

- [ ] **Step 1: Write the default-order and timeline tests**

```tsx
it('shows Moderna before the remaining seeded companies', async () => {
  render(<CompaniesPage />);
  expect((await screen.findAllByRole('link'))[0]).toHaveTextContent('Moderna');
});

it('lists a patent and a paper on the company timeline', async () => {
  render(<CompanyDetailPage />);
  expect(await screen.findByText(/patent/i)).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: /pubmed/i })).toBeVisible();
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `pnpm --filter @cala/web test CompaniesPage.test.tsx`

Expected: fail because the pages do not exist.

- [ ] **Step 3: Implement directory and entity detail views**

Use Tailwind CSS and native React/HTML only. Company detail shows timeline (papers, patents, trials, news), linked people and institutions, developments, finance findings, and agent statuses. Person and institution pages show affiliation and connected papers/patents/trials.

- [ ] **Step 4: Verify routes and tests**

Run: `pnpm --filter @cala/web test && pnpm --filter @cala/web typecheck`

Expected: pass.

- [ ] **Step 5: Commit**

Split company list vs detail vs person/institution if the diff is large.

```bash
git add apps/web
git commit -m "feat(web): show company people and research timeline"
```

## Task 9: Build momentum and daily report pages

**Owner:** Developer 3

**Files:**
- Create: `apps/web/src/pages/{ReportsPage,MomentumReportPage,ReportDetailPage}.tsx`
- Create: `apps/web/src/components/FinanceFindingCard.tsx`
- Test: `apps/web/src/pages/MomentumReportPage.test.tsx`

**Interfaces:**
- `getMomentumReport(companyId: string): Promise<MomentumReport>`
- `getReport(id: string): Promise<DailyReport>`

- [ ] **Step 1: Write the precursor-link test**

```tsx
it('links momentum events to graph entities and evidence', async () => {
  render(<MomentumReportPage />);
  expect(await screen.findByRole('link', { name: /source patent/i })).toHaveAttribute('href', expect.stringContaining('/knowledge-graph'));
  expect(await screen.findByText(/melanoma/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify failure**

Run: `pnpm --filter @cala/web test MomentumReportPage.test.tsx`

Expected: fail because the page does not exist.

- [ ] **Step 3: Implement momentum and daily briefing views**

Momentum report must show an ordered precursor trail (patents, papers, collaborations, trials, acquisitions, disclosures) then the public catalyst, each linked to company/person/institution and evidence. Daily report ranks qualifying finance findings by impact and confidence.

- [ ] **Step 4: Verify routes and tests**

Run: `pnpm --filter @cala/web test && pnpm --filter @cala/web typecheck`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): show company momentum reports"
```

## Task 10: Verify the seeded Moderna momentum demo

**Owner:** All developers

**Files:**
- Create: `scripts/demo-check.ts`
- Modify: `README.md`
- Test: `scripts/demo-check.test.ts`

**Interfaces:**
- `demo-check` exits non-zero unless twenty companies, graph artifacts, a persisted `HealthcareGate`, and — when `isNew && isRelevant` — a Cala finance snapshot plus `FinanceImpact` exist.

- [ ] **Step 1: Write the failing end-to-end assertion**

```ts
expect(summary).toMatchObject({
  companies: 20,
  papers: expect.any(Number),
  patents: expect.any(Number),
  people: expect.any(Number),
  institutions: expect.any(Number),
  momentumReports: expect.any(Number),
  graphRelationships: expect.any(Number),
});
expect(modernaMomentum.events.some((e) => e.kind === 'patent' || e.kind === 'paper')).toBe(true);
```

- [ ] **Step 2: Run the check to verify failure**

Run: `pnpm demo-check`

Expected: fail until seed and workflow have produced all artifacts.

- [ ] **Step 3: Implement the read-only demo check and runbook**

The README must document `docker compose up`, migrations, seeding, starting API/worker/web, pressing Run now, and the Moderna melanoma mRNA-vaccine narrative: graph neighborhood, timeline of precursors, momentum report, optional finance finding. The script must query stores only; it must not mutate them.

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
2. `feat(data): define healthcare graph records`
3. `feat(api): add directory timeline and run endpoints` (split if needed)
4. Vertical-slice source-adapter PRs (pubmed, clinical-trials, news, web_news/Tavily); patents, fda, dailymed, sec deferred
5. `feat(agents): fan out research and gate finance analysis` (split Cala+Fastino clients / research / workflow if needed) — **shipped** on `mauro/dev2-agents-pipeline`
6. `feat(graph): project healthcare world relationships` — **shipped**
6b. `feat(worker): run intelligence workflow on enqueue` — **shipped**
7. `feat(web): add healthcare knowledge graph explorer`
8. `feat(web): show company people and research timeline`
9. `feat(web): show company momentum reports`
10. `docs: add local demo runbook`

Each PR description must use:

```markdown
## What

- <past-tense shipped outcome>

## Why

- <problem or decision>
```

## Self-review

- Scope coverage: POST /runs fan-out, Cala healthcare vs finance (real `knowledge/query` client + mock), OpenAI research tools, Fastino gate and finance behind a swappable OpenAI-backed client, PostgreSQL, Neo4j, worker wiring, and the Moderna demo are assigned to tasks.
- Developer 1 owns the run-graph contracts and tables (`cala_snapshots`, `healthcare_gates`, `finance_impacts`) in Task 2 and the `GET /knowledge-graph` route in Task 3; Developer 2 consumes them.
- Developer 2 vertical slice **shipped** on `mauro/dev2-agents-pipeline`: pubmed/clinical-trials/news/web_news adapters (Task 4), dependency-injected workflow (Task 5), Neo4j projection with a fake driver (Task 6), worker + live demo (Task 6b). `web_news` is Tavily title+snippet+URL; it does not change the healthcare gate. Remaining: dashboard (Developer 3), patents/FDA/DailyMed/SEC, people/institution linking, momentum synthesis, real Fastino HF endpoints.
- Testability: every external service (Cala, Fastino, OpenAI, Neo4j) is injected, so `pnpm test` passes with mocks and in-memory repos; live keys are only needed for `scripts/run-moderna.ts`.
- No placeholders: every task declares files, interfaces, a focused test, runnable commands, and a commit.
