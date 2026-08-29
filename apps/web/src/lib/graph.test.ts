import { describe, expect, it } from 'vitest';
import { layoutAllCompanies, layoutModernaScene, layoutNeighborhood, mergeExpansion } from './graph';

const moderna = { id: 'company-entity', entityType: 'company', label: 'Moderna', sourceId: 'company-id' };
const merck = { id: 'merck-entity', entityType: 'company', label: 'Merck & Co.', sourceId: 'merck-id' };
const paper = { id: 'paper-1', entityType: 'paper', label: 'mRNA-4157 plus pembrolizumab in melanoma', sourceId: 'document-1' };
const trial = { id: 'trial-1', entityType: 'clinical_trial', label: 'NCT03897881 KEYNOTE-942', sourceId: 'document-2' };
const news = { id: 'news-1', entityType: 'news', label: 'Melanoma recurrence cut in half', sourceId: 'document-3' };
const base = {
  nodes: [moderna, paper],
  edges: [
    { id: 'edge-1', fromEntityId: 'paper-1', toEntityId: 'company-entity', relationshipType: 'RESEARCH_ON', evidenceDocumentId: 'document-1' },
  ],
};

describe('knowledge graph mapping', () => {
  it('centers the selected company and maps relationship endpoints', () => {
    const graph = layoutNeighborhood(base, 'company-id');
    expect(graph.nodes.find((node) => node.id === 'company-entity')).toMatchObject({ position: { x: 0, y: 0 }, data: { isHub: true } });
    expect(graph.edges[0]).toMatchObject({ source: 'paper-1', target: 'company-entity' });
  });

  it('merges an expansion without duplicating existing nodes or edges', () => {
    const graph = layoutNeighborhood(base, 'company-id');
    const expansion = {
      nodes: [
        base.nodes[1],
        { id: 'news-1', entityType: 'news', label: 'Trial results announced', sourceId: 'document-2' },
      ],
      edges: [
        base.edges[0],
        { id: 'edge-2', fromEntityId: 'news-1', toEntityId: 'paper-1', relationshipType: 'EVIDENCES', evidenceDocumentId: 'document-2' },
      ],
    };
    const merged = mergeExpansion(graph.nodes, graph.edges, expansion, 'paper-1');
    expect(merged.nodes.map((node) => node.id)).toEqual(['company-entity', 'paper-1', 'news-1']);
    expect(merged.edges.map((edge) => edge.id)).toEqual(['edge-1', 'edge-2']);
    expect(merged.nodes.find((node) => node.id === 'paper-1')?.data.expanded).toBe(true);
  });

  it('pins the Moderna narrative scene and links Merck plus the program', () => {
    const graph = layoutModernaScene({
      nodes: [moderna, paper, trial, news],
      edges: [
        { id: 'e-paper', fromEntityId: paper.id, toEntityId: moderna.id, relationshipType: 'RESEARCH_ON', evidenceDocumentId: 'document-1' },
        { id: 'e-trial', fromEntityId: trial.id, toEntityId: moderna.id, relationshipType: 'TRIAL_BY', evidenceDocumentId: 'document-2' },
        { id: 'e-news', fromEntityId: news.id, toEntityId: moderna.id, relationshipType: 'REPORTED_ON', evidenceDocumentId: 'document-3' },
      ],
    }, 'company-id', merck);
    expect(graph.nodes.find((node) => node.id === moderna.id)?.data).toMatchObject({ shortLabel: 'Moderna', isHub: true });
    expect(graph.nodes.find((node) => node.id === merck.id)?.data).toMatchObject({ shortLabel: 'Merck', isPartner: true });
    expect(graph.nodes.find((node) => node.id === paper.id)?.data.shortLabel).toBe('mRNA-4157 + pembro');
    expect(graph.nodes.find((node) => node.id === news.id)?.data.shortLabel).toBe('Melanoma recurrence cut');
    expect(graph.nodes.find((node) => node.id === trial.id)?.data.shortLabel).toBe('NCT03897881');
    expect(graph.edges.some((edge) => edge.data?.relationshipType === 'COLLABORATES_WITH')).toBe(true);
    expect(graph.edges.filter((edge) => edge.data?.relationshipType === 'ABOUT')).toHaveLength(3);
  });

  it('places every company without dropping isolated nodes', () => {
    const graph = layoutAllCompanies({
      nodes: [moderna, merck, paper],
      edges: base.edges,
    });
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(['company-entity', 'merck-entity', 'paper-1']);
    expect(graph.nodes.filter((node) => node.data.entityType === 'company' && node.data.isHub)).toHaveLength(2);
  });
});
