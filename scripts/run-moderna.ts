import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Company } from '@cala/contracts';

function loadDotEnv(): void {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value;
  }
}
loadDotEnv();

import {
  HttpCalaClient,
  MockCalaClient,
  MockFastinoClient,
  OpenAIFastinoClient,
  createOpenAIClient,
  defaultDeps,
  defaultResearchTools,
  runIntelligenceWorkflow,
  type ResearchTool,
  type WorkflowDeps,
} from '@cala/agents';
import { createInMemoryRepositories, createInMemoryStore, createRepositoriesFromEnv, migrate, seedCompanies, type InMemoryStore } from '@cala/db';
import { InMemoryGraph, type GraphProjector } from '@cala/graph';
import type { NormalizedDocument } from '@cala/ingestion';

// The Moderna melanoma-vaccine narrative: precursor papers, a trial, and the
// announcement that moved the stock. Used when running offline.
const MODERNA: Company = { id: 'moderna', name: 'Moderna', ticker: 'MRNA', displayOrder: 0, recency: 'high', createdAt: new Date().toISOString() };
const FIXTURE_DOCS: NormalizedDocument[] = [
  { provider: 'pubmed', providerId: '37000001', companyId: MODERNA.id, url: 'https://pubmed.ncbi.nlm.nih.gov/37000001/', publishedAt: '2023-07-15T00:00:00.000Z', title: 'mRNA-4157 neoantigen vaccine plus pembrolizumab in resected melanoma', text: 'Adjuvant individualized neoantigen therapy reduced recurrence.', rawPayload: {}, contentHash: 'f1', documentKind: 'paper' },
  { provider: 'clinicaltrials', providerId: 'NCT03897881', companyId: MODERNA.id, url: 'https://clinicaltrials.gov/study/NCT03897881', publishedAt: '2019-04-01T00:00:00.000Z', title: 'mRNA-4157 (V940) in combination with pembrolizumab in melanoma', text: 'Phase 2b adjuvant study in high-risk melanoma.', rawPayload: {}, contentHash: 'f2', documentKind: 'trial' },
  { provider: 'news', providerId: 'moderna-2023-melanoma', companyId: MODERNA.id, url: 'https://investors.modernatx.com/news/mrna-4157-melanoma', publishedAt: '2023-12-14T00:00:00.000Z', title: 'Moderna and Merck: mRNA-4157 significantly reduced melanoma recurrence', text: 'Combination cut risk of recurrence or death versus pembrolizumab alone.', rawPayload: {}, contentHash: 'f3', documentKind: 'news' },
];

function offlineTools(): ResearchTool[] {
  return [
    { name: 'pubmed', run: async () => FIXTURE_DOCS.filter((d) => d.provider === 'pubmed') },
    { name: 'clinicaltrials', run: async () => FIXTURE_DOCS.filter((d) => d.provider === 'clinicaltrials') },
    { name: 'news', run: async () => FIXTURE_DOCS.filter((d) => d.provider === 'news') },
  ];
}

function buildOfflineDeps(): { deps: WorkflowDeps; live: boolean; graph: InMemoryGraph; store: InMemoryStore; runId: string; companyId: string } {
  const graph = new InMemoryGraph();
  const store = createInMemoryStore({ companies: [MODERNA] });
  const repos = createInMemoryRepositories(store);
  const runId = 'moderna-demo';
  void repos.runs.update(runId, { companyId: MODERNA.id, mode: 'delta', status: 'queued', phase: 'queued' });
  const live = false;
  return {
    live,
    graph,
    store,
    runId,
    companyId: MODERNA.id,
    deps: {
      cala: new MockCalaClient({ healthcare: { input: 'companies.name=Moderna', entities: [{ id: 'e1', entityType: 'Company', name: 'Moderna', mentions: ['Moderna'] }], results: [{ company: 'Moderna', pipeline: 'mRNA-4157' }] } }),
      fastino: new MockFastinoClient({
        gate: { isNew: true, isRelevant: true, relevanceScore: 0.93, rationale: 'Novel adjuvant melanoma readout with regulatory catalyst potential.', developmentSummary: 'mRNA-4157 cut melanoma recurrence in a randomized readout.' },
        impact: { developmentSummary: 'mRNA-4157 melanoma readout', potentialProductOrCatalyst: 'Individualized neoantigen therapy approval', expectedImpact: { direction: 'up', magnitude: 'high', horizon: '12-18m', confidence: 0.7 }, rationale: 'First-in-class adjuvant benefit expands addressable oncology market.', evidenceIds: [] },
      }),
      repos,
      graph,
      tools: offlineTools(),
    },
  };
}

async function buildLiveDeps(): Promise<{ deps: WorkflowDeps; live: boolean; graph: GraphProjector; store: InMemoryStore | null; runId: string; companyId: string }> {
  if (process.env.DATABASE_URL) {
    await migrate();
    await seedCompanies();
    const repos = createRepositoriesFromEnv();
    const moderna = (await repos.companies.list()).find((c) => c.ticker === 'MRNA');
    if (!moderna) throw new Error('Moderna was not seeded');
    const run = await repos.runs.create({ companyId: moderna.id, mode: 'seed' });
    const deps = defaultDeps();
    return { live: true, graph: deps.graph, store: null, runId: run.id, companyId: moderna.id, deps };
  }
  const graph = new InMemoryGraph();
  const store = createInMemoryStore({ companies: [MODERNA] });
  const repos = createInMemoryRepositories(store);
  void repos.runs.update('moderna-demo', { companyId: MODERNA.id, mode: 'delta', status: 'queued', phase: 'queued' });
  const openai = createOpenAIClient();
  return {
    live: true,
    graph,
    store,
    runId: 'moderna-demo',
    companyId: MODERNA.id,
    deps: {
      openai,
      cala: new HttpCalaClient({ timeoutMs: 90_000 }),
      fastino: new OpenAIFastinoClient(openai.chat),
      repos,
      graph,
      tools: defaultResearchTools({ newsFeedFor: () => process.env.NEWS_FEED_URL || null }),
    },
  };
}

async function main(): Promise<void> {
  const live = Boolean(process.env.OPENAI_API_KEY && process.env.CALA_API_KEY);
  const ctx = live ? await buildLiveDeps() : buildOfflineDeps();
  console.log(`Running Moderna momentum demo (${ctx.live ? 'LIVE' : 'OFFLINE mock'} mode)...\n`);
  const state = await runIntelligenceWorkflow(ctx.runId, ctx.deps);
  const neighborhood = await ctx.graph.neighborhood({ companyId: ctx.companyId });

  console.log('Documents ingested :', state.documentIds.length);
  console.log('Graph nodes        :', neighborhood.nodes.length);
  console.log('Graph edges        :', neighborhood.edges.map((e) => e.relationshipType).join(', '));
  console.log('Errors             :', state.errors.length ? state.errors.join('; ') : 'none');
  console.log('\nHealthcare gate    :', JSON.stringify(state.healthcareGate, null, 2));
  if (state.financeImpactId && ctx.store) {
    console.log('\nFinance impact     :', JSON.stringify(ctx.store.financeImpacts.at(-1), null, 2));
  } else if (state.financeImpactId) {
    console.log('\nFinance impact     : persisted', state.financeImpactId);
  } else {
    console.log('\nFinance impact     : gate stopped the run (not new/relevant).');
  }
  await ctx.graph.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
