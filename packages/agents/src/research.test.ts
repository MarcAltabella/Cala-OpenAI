import type { Company } from '@cala/contracts';
import { createInMemoryRepositories } from '@cala/db';
import { InMemoryGraph } from '@cala/graph';
import type { NormalizedDocument, SourceContext } from '@cala/ingestion';
import { SourceAdapterError } from '@cala/ingestion';
import { describe, expect, it } from 'vitest';
import { StubEmbeddingModel } from './models.js';
import { runResearch } from './research.js';
import { buildRelationPack } from './relations.js';
import type { ResearchTool } from './tools.js';

const company: Company = { id: 'moderna', name: 'Moderna', ticker: 'MRNA', displayOrder: 0, recency: 'high', createdAt: '2026-01-01T00:00:00.000Z' };

function paperDoc(id: string): NormalizedDocument {
  return { provider: 'pubmed', providerId: id, companyId: company.id, url: `https://pubmed/${id}`, publishedAt: null, title: `Paper ${id}`, text: `text ${id}`, rawPayload: {}, contentHash: `h${id}`, documentKind: 'paper' };
}

const pubmedTool = (docs: NormalizedDocument[]): ResearchTool => ({ name: 'pubmed', run: async (_c: SourceContext) => docs });
const failingTool = (name: string): ResearchTool => ({ name, run: async () => { throw new SourceAdapterError(name, 'boom'); } });

describe('runResearch', () => {
  it('persists documents, entities, and relationships and projects to the graph', async () => {
    const repos = createInMemoryRepositories();
    const graph = new InMemoryGraph();
    const result = await runResearch({ company }, { tools: [pubmedTool([paperDoc('1'), paperDoc('2')])], repos, graph });
    expect(result.documentIds).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(graph.relationshipCount('RESEARCH_ON')).toBe(2);
    expect(graph.entityCount()).toBe(3); // company + 2 papers
  });

  it('deduplicates repeated documents across runs', async () => {
    const repos = createInMemoryRepositories();
    const graph = new InMemoryGraph();
    await runResearch({ company }, { tools: [pubmedTool([paperDoc('1')])], repos, graph });
    await runResearch({ company }, { tools: [pubmedTool([paperDoc('1')])], repos, graph });
    expect((await repos.documents.listByCompany(company.id))).toHaveLength(1);
    expect(graph.relationshipCount('RESEARCH_ON')).toBe(1);
  });

  it('records a failing tool without aborting sibling tools', async () => {
    const repos = createInMemoryRepositories();
    const graph = new InMemoryGraph();
    const result = await runResearch({ company }, { tools: [failingTool('pubmed'), pubmedTool([paperDoc('9')])], repos, graph });
    expect(result.errors.some((e) => e.includes('pubmed'))).toBe(true);
    expect(result.documentIds).toHaveLength(1);
  });

  it('embeds only newly ingested documents', async () => {
    const repos = createInMemoryRepositories();
    const graph = new InMemoryGraph();
    let embedCalls = 0;
    const embeddings = new StubEmbeddingModel();
    const spy = { embed: async (t: string[]) => { embedCalls += 1; return embeddings.embed(t); } };
    await runResearch({ company }, { tools: [pubmedTool([paperDoc('1')])], repos, graph, embeddings: spy });
    await runResearch({ company }, { tools: [pubmedTool([paperDoc('1')])], repos, graph, embeddings: spy });
    expect(embedCalls).toBe(1); // second run has no new documents
  });
});

describe('buildRelationPack', () => {
  it('summarizes the projected neighborhood', async () => {
    const repos = createInMemoryRepositories();
    const graph = new InMemoryGraph();
    await runResearch({ company }, { tools: [pubmedTool([paperDoc('1')])], repos, graph });
    const pack = await buildRelationPack(company, { graph });
    expect(pack.companyId).toBe('moderna');
    expect(pack.edges).toHaveLength(1);
    expect(pack.brief).toContain('Moderna');
  });
});
