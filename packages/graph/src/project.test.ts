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

  it('expands from an arbitrary node and filters neighbor entity types', async () => {
    const graph = new InMemoryGraph();
    const news: GraphEntity = { id: 'n1', entityType: 'news', label: 'Readout', sourceId: null };
    const newsEdge: GraphRelationship = { id: 'r2', fromEntityId: 'n1', toEntityId: 'p1', relationshipType: 'EVIDENCES', evidenceDocumentId: null };
    await projectAll(graph, { entities: [company, paper, news], relationships: [edge, newsEdge] });
    const expanded = await graph.neighborhood({ nodeId: 'p1', entityTypes: ['news'] });
    expect(expanded.nodes.map((node) => node.id).sort()).toEqual(['n1', 'p1']);
    expect(expanded.edges.map((relationship) => relationship.id)).toEqual(['r2']);
  });

  it('reports in-memory connectivity', async () => {
    await expect(new InMemoryGraph().verifyConnectivity()).resolves.toBeUndefined();
  });

  it('returns every company and relation when no seed is given', async () => {
    const graph = new InMemoryGraph();
    const merck: GraphEntity = { id: 'c2', entityType: 'company', label: 'Merck', sourceId: 'merck' };
    await projectAll(graph, { entities: [company, paper, merck], relationships: [edge] });
    const result = await graph.neighborhood({ limit: 10_000 });
    expect(result.nodes.map((node) => node.id).sort()).toEqual(['c1', 'c2', 'p1']);
    expect(result.edges).toHaveLength(1);
  });
});
