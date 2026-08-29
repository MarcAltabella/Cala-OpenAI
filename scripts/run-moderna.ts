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
  defaultResearchTools,
  runIntelligenceWorkflow,
  type ResearchTool,
  type WorkflowDeps,
} from '@cala/agents';
import { createInMemoryRepositories, createInMemoryStore, type InMemoryStore } from '@cala/db';
import { InMemoryGraph } from '@cala/graph';
import type { NormalizedDocument } from '@cala/ingestion';

// The Moderna melanoma-vaccine narrative: precursor papers, a trial, and the
// announcement that moved the stock. Used when running offline.
const MODERNA: Company = { id: 'moderna', name: 'Moderna', ticker: 'MRNA', displayOrder: 0, createdAt: new Date().toISOString() };
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

function buildDeps(): { deps: WorkflowDeps; live: boolean; graph: InMemoryGraph; store: InMemoryStore } {
  const graph = new InMemoryGraph();
  const store = createInMemoryStore({ companies: [MODERNA] });
  const repos = createInMemoryRepositories(store);
  void repos.runs.update('moderna-demo', { companyId: MODERNA.id, mode: 'delta', status: 'queued', phase: 'queued' });
  const live = Boolean(process.env.OPENAI_API_KEY && process.env.CALA_API_KEY);
  if (live) {
    const openai = createOpenAIClient();
    return {
      live,
      graph,
      store,
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
  return {
    live,
    graph,
    store,
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

async function main(): Promise<void> {
  const { deps, live, graph, store } = buildDeps();
  console.log(`Running Moderna momentum demo (${live ? 'LIVE' : 'OFFLINE mock'} mode)...\n`);
  const state = await runIntelligenceWorkflow('moderna-demo', deps);
  const neighborhood = await graph.neighborhood({ companyId: MODERNA.id });

  console.log('Documents ingested :', state.documentIds.length);
  console.log('Graph nodes        :', neighborhood.nodes.length);
  console.log('Graph edges        :', neighborhood.edges.map((e) => e.relationshipType).join(', '));
  console.log('Errors             :', state.errors.length ? state.errors.join('; ') : 'none');
  console.log('\nHealthcare gate    :', JSON.stringify(state.healthcareGate, null, 2));
  if (state.financeImpactId) {
    console.log('\nFinance impact     :', JSON.stringify(store.financeImpacts.at(-1), null, 2));
  } else {
    console.log('\nFinance impact     : gate stopped the run (not new/relevant).');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
