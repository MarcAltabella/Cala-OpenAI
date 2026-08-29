import type { GraphEntity, GraphRelationship } from '@cala/contracts';
import { describe, expect, it } from 'vitest';
import { InMemoryGraph } from './client.js';
import { projectAll } from './project.js';

const company: GraphEntity = { id: 'c1', entityType: 'company', label: 'Moderna', sourceId: 'moderna' };
const paper: GraphEntity = { id: 'p1', entityType: 'paper', label: 'mRNA-4157 melanoma', sourceId: null };
const edge: GraphRelationship = { id: 'r1', fromEntityId: 'p1', toEntityId: 'c1', relationshipType: 'DEVELOPED_BY', evidenceDocumentId: 'doc-1' };

describe('graph projection', () => {
  it('merges the same relationship once', async () => {
    const graph = new InMemoryGraph();
    await graph.projectEntity(company);
    await graph.projectEntity(paper);
    await graph.projectRelationship(edge);
    await graph.projectRelationship(edge);
    expect(graph.relationshipCount('DEVELOPED_BY')).toBe(1);
  });

  it('merges the same entity once', async () => {
    const graph = new InMemoryGraph();
    await graph.projectEntity(company);
    await graph.projectEntity({ ...company, label: 'Moderna, Inc.' });
    expect(graph.entityCount()).toBe(1);
  });

  it('returns the one-hop neighborhood of a company', async () => {
    const graph = new InMemoryGraph();
    await projectAll(graph, { entities: [company, paper], relationships: [edge] });
    const result = await graph.neighborhood({ companyId: 'moderna' });
    expect(result.edges).toHaveLength(1);
    expect(result.nodes.map((n) => n.id).sort()).toEqual(['c1', 'p1']);
  });

  it('filters the neighborhood by relationship type', async () => {
    const graph = new InMemoryGraph();
    await projectAll(graph, { entities: [company, paper], relationships: [edge] });
    expect((await graph.neighborhood({ companyId: 'moderna', types: ['ACQUIRED'] })).edges).toHaveLength(0);
  });
});
