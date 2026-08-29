import type { Edge, Node } from '@xyflow/react';
import type { GraphEntity, GraphNeighborhood } from './api';

export const ENTITY_STYLES: Record<string, { color: string; label: string }> = {
  company: { color: '#2F6F5E', label: 'Companies' },
  clinical_trial: { color: '#6C82D8', label: 'Clinical trials' },
  paper: { color: '#55AE83', label: 'Papers' },
  news: { color: '#D09A52', label: 'News' },
  patent: { color: '#C47A3A', label: 'Patents' },
  person: { color: '#6B7C8A', label: 'People' },
  institution: { color: '#8B6BA8', label: 'Institutions' },
  program: { color: '#3D8B8B', label: 'Programs / products' },
  product: { color: '#3D8B8B', label: 'Programs / products' },
};

export const RELATION_STYLES: Record<string, { color: string; dashed?: boolean; width?: number; label: string }> = {
  RESEARCH_ON: { color: '#55AE83', label: 'RESEARCH_ON' },
  TRIAL_BY: { color: '#6C82D8', dashed: true, label: 'TRIAL_BY' },
  REPORTED_ON: { color: '#D09A52', width: 2.4, label: 'REPORTED_ON' },
  PATENT_OF: { color: '#C47A3A', dashed: true, label: 'PATENT_OF' },
  COLLABORATES_WITH: { color: '#2F6F5E', width: 3, label: 'COLLABORATES_WITH' },
  ABOUT: { color: '#81958D', width: 1.4, label: 'ABOUT' },
  EVIDENCES: { color: '#81958D', width: 1.4, label: 'EVIDENCES' },
};

export type KnowledgeNodeData = {
  label: string;
  shortLabel: string;
  entityType: string;
  color: string;
  isHub: boolean;
  isPartner: boolean;
  expanded: boolean;
};
export type KnowledgeNode = Node<KnowledgeNodeData, 'knowledge'>;

const shortLabel = (label: string, max = 42) => label.length > max ? `${label.slice(0, max - 1)}…` : label;

function firstMatch(nodes: GraphEntity[], type: string, patterns: RegExp[]) {
  const pool = nodes.filter((node) => node.entityType === type);
  for (const pattern of patterns) {
    const hit = pool.find((node) => pattern.test(node.label));
    if (hit) return hit;
  }
  return pool[0];
}

function flowNode(entity: GraphEntity, position: { x: number; y: number }, extras: Partial<KnowledgeNodeData> = {}): KnowledgeNode {
  return {
    id: entity.id,
    type: 'knowledge',
    position,
    data: {
      label: entity.label,
      shortLabel: extras.shortLabel ?? shortLabel(entity.label),
      entityType: entity.entityType,
      color: ENTITY_STYLES[entity.entityType]?.color ?? '#81958D',
      isHub: extras.isHub ?? false,
      isPartner: extras.isPartner ?? false,
      expanded: extras.expanded ?? false,
    },
  };
}

function flowEdges(relationships: GraphNeighborhood['edges']): Edge[] {
  return relationships.map((relationship) => {
    const style = RELATION_STYLES[relationship.relationshipType] ?? { color: '#9AA7A1', label: relationship.relationshipType };
    return {
      id: relationship.id,
      source: relationship.fromEntityId,
      target: relationship.toEntityId,
      type: 'default',
      data: { relationshipType: relationship.relationshipType, label: style.label },
      label: relationship.relationshipType.replaceAll('_', ' '),
      labelStyle: { fill: style.color, fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.92 },
      labelBgPadding: [5, 3] as [number, number],
      className: 'knowledge-edge',
      style: { stroke: style.color, strokeWidth: style.width ?? 1.8, strokeDasharray: style.dashed ? '6 5' : undefined },
    } satisfies Edge;
  });
}

function uniqueEntities(nodes: GraphEntity[]) {
  const map = new Map<string, GraphEntity>();
  for (const node of nodes) map.set(node.id, node);
  return [...map.values()];
}

function ringPosition(index: number, total: number, radiusX: number, radiusY: number, origin = { x: 0, y: 0 }) {
  const angle = index * ((Math.PI * 2) / Math.max(total, 1)) - Math.PI / 2;
  return { x: origin.x + Math.cos(angle) * radiusX, y: origin.y + Math.sin(angle) * radiusY };
}

export function layoutNeighborhood(neighborhood: GraphNeighborhood, seedId?: string): { nodes: KnowledgeNode[]; edges: Edge[] } {
  const hub = neighborhood.nodes.find((node) => node.id === seedId || node.sourceId === seedId) ?? neighborhood.nodes.find((node) => node.entityType === 'company') ?? neighborhood.nodes[0];
  const satellites = neighborhood.nodes.filter((node) => node.id !== hub?.id).sort((a, b) => a.entityType.localeCompare(b.entityType) || a.label.localeCompare(b.label));
  const nodes = neighborhood.nodes.map((entity) => {
    const isHub = entity.id === hub?.id;
    const index = satellites.findIndex((item) => item.id === entity.id);
    const ring = Math.floor(index / 18);
    const ringItems = satellites.slice(ring * 18, ring * 18 + 18);
    const ringIndex = ringItems.findIndex((item) => item.id === entity.id);
    return flowNode(entity, isHub ? { x: 0, y: 0 } : ringPosition(ringIndex, ringItems.length, 350 + ring * 245, 250 + ring * 175), { isHub });
  });
  return { nodes, edges: flowEdges(neighborhood.edges) };
}

export function layoutAllCompanies(neighborhood: GraphNeighborhood): { nodes: KnowledgeNode[]; edges: Edge[] } {
  const companies = neighborhood.nodes.filter((node) => node.entityType === 'company').sort((a, b) => a.label.localeCompare(b.label));
  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(companies.length, 1))));
  const companyOrigin = new Map(companies.map((company, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return [company.id, { x: col * 780, y: row * 620 }] as const;
  }));
  const owner = new Map<string, string>();
  for (const edge of neighborhood.edges) {
    const fromCompany = companyOrigin.has(edge.fromEntityId);
    const toCompany = companyOrigin.has(edge.toEntityId);
    if (fromCompany && !toCompany) owner.set(edge.toEntityId, edge.fromEntityId);
    if (toCompany && !fromCompany) owner.set(edge.fromEntityId, edge.toEntityId);
  }
  const satellitesByCompany = new Map<string, GraphEntity[]>();
  const unattached: GraphEntity[] = [];
  for (const entity of neighborhood.nodes) {
    if (entity.entityType === 'company') continue;
    const companyId = owner.get(entity.id);
    if (!companyId) {
      unattached.push(entity);
      continue;
    }
    const group = satellitesByCompany.get(companyId) ?? [];
    group.push(entity);
    satellitesByCompany.set(companyId, group);
  }
  const nodes = neighborhood.nodes.map((entity) => {
    if (entity.entityType === 'company') {
      return flowNode(entity, companyOrigin.get(entity.id) ?? { x: 0, y: 0 }, { isHub: true, shortLabel: shortLabel(entity.label, 28) });
    }
    const companyId = owner.get(entity.id);
    const origin = companyId ? companyOrigin.get(companyId) ?? { x: 0, y: 0 } : { x: cols * 780, y: 0 };
    const group = companyId ? satellitesByCompany.get(companyId) ?? [entity] : unattached;
    const index = group.findIndex((item) => item.id === entity.id);
    const ring = Math.floor(index / 10);
    const ringItems = group.slice(ring * 10, ring * 10 + 10);
    const ringIndex = ringItems.findIndex((item) => item.id === entity.id);
    return flowNode(entity, ringPosition(ringIndex, ringItems.length, 210 + ring * 160, 150 + ring * 120, origin));
  });
  return { nodes, edges: flowEdges(neighborhood.edges) };
}

export function layoutModernaScene(
  neighborhood: GraphNeighborhood,
  modernaId: string,
  merck?: GraphEntity | null,
): { nodes: KnowledgeNode[]; edges: Edge[] } {
  const entities = uniqueEntities([
    ...neighborhood.nodes,
    ...(merck ? [merck] : []),
  ]);
  const moderna = entities.find((node) => node.id === modernaId || node.sourceId === modernaId)
    ?? entities.find((node) => node.entityType === 'company' && /moderna/i.test(node.label));
  const paper = firstMatch(entities, 'paper', [/mrna[-\s]?4157/i, /pembro/i, /personalized/i, /neoantigen/i, /melanoma/i]);
  const trial = firstMatch(entities, 'clinical_trial', [/NCT03897881/i, /keynote[-\s]?942/i, /melanoma/i]);
  const news = firstMatch(entities, 'news', [/recurrence/i, /melanoma/i, /mrna[-\s]?4157/i, /cancer vaccine/i]);
  const merckNode = merck ?? entities.find((node) => node.entityType === 'company' && /merck/i.test(node.label) && node.id !== moderna?.id);
  let program = entities.find((node) => node.entityType === 'program' || node.entityType === 'product')
    ?? entities.find((node) => /mrna[-\s]?4157/i.test(node.label) && node.entityType !== 'paper' && node.entityType !== 'clinical_trial' && node.entityType !== 'news');
  if (!program) program = { id: 'scene:mrna-4157', entityType: 'program', label: 'mRNA-4157', sourceId: null };

  const featured = new Map<string, { position: { x: number; y: number }; shortLabel: string; isHub?: boolean; isPartner?: boolean }>();
  if (moderna) featured.set(moderna.id, { position: { x: 0, y: 48 }, shortLabel: 'Moderna', isHub: true });
  featured.set(program.id, { position: { x: 0, y: -70 }, shortLabel: 'mRNA-4157' });
  if (paper) featured.set(paper.id, { position: { x: 0, y: -310 }, shortLabel: 'mRNA-4157 + pembro' });
  if (news) featured.set(news.id, { position: { x: -430, y: 48 }, shortLabel: 'Melanoma recurrence cut' });
  if (trial) featured.set(trial.id, { position: { x: 430, y: 48 }, shortLabel: trial.label.match(/NCT\d+/i)?.[0] ?? 'NCT03897881' });
  if (merckNode) featured.set(merckNode.id, { position: { x: 0, y: 340 }, shortLabel: 'Merck', isPartner: true });

  const allEntities = uniqueEntities([...entities, program, ...(merckNode ? [merckNode] : [])]);
  const satellites = allEntities.filter((entity) => !featured.has(entity.id)).sort((a, b) => a.entityType.localeCompare(b.entityType) || a.label.localeCompare(b.label));
  const nodes = allEntities.map((entity) => {
    const scene = featured.get(entity.id);
    if (scene) return flowNode(entity, scene.position, scene);
    const index = satellites.findIndex((item) => item.id === entity.id);
    const ring = Math.floor(index / 16);
    const ringItems = satellites.slice(ring * 16, ring * 16 + 16);
    const ringIndex = ringItems.findIndex((item) => item.id === entity.id);
    return flowNode(entity, ringPosition(ringIndex, ringItems.length, 620 + ring * 230, 460 + ring * 170, { x: 0, y: 48 }));
  });

  const edges = [...neighborhood.edges];
  const has = (type: string, from: string, to: string) => edges.some((edge) => edge.relationshipType === type && (
    (edge.fromEntityId === from && edge.toEntityId === to) || (edge.fromEntityId === to && edge.toEntityId === from)
  ));
  if (moderna && merckNode && !has('COLLABORATES_WITH', merckNode.id, moderna.id)) {
    edges.push({ id: 'scene:collaborates', fromEntityId: merckNode.id, toEntityId: moderna.id, relationshipType: 'COLLABORATES_WITH', evidenceDocumentId: null });
  }
  for (const evidence of [paper, news, trial]) {
    if (evidence && !has('ABOUT', evidence.id, program.id)) {
      edges.push({ id: `scene:about:${evidence.id}`, fromEntityId: evidence.id, toEntityId: program.id, relationshipType: 'ABOUT', evidenceDocumentId: null });
    }
  }
  return { nodes, edges: flowEdges(edges) };
}

export function mergeExpansion(
  currentNodes: KnowledgeNode[],
  currentEdges: Edge[],
  neighborhood: GraphNeighborhood,
  parentId: string,
): { nodes: KnowledgeNode[]; edges: Edge[] } {
  const nodeIds = new Set(currentNodes.map((node) => node.id));
  const edgeIds = new Set(currentEdges.map((edge) => edge.id));
  const parent = currentNodes.find((node) => node.id === parentId);
  const added = neighborhood.nodes.filter((node) => !nodeIds.has(node.id));
  const newNodes = added.map((entity, index) => flowNode(entity, ringPosition(index, added.length, 250, 190, parent?.position ?? { x: 0, y: 0 })));
  const expansion = layoutNeighborhood({ nodes: neighborhood.nodes, edges: neighborhood.edges });
  return {
    nodes: [
      ...currentNodes.map((node) => node.id === parentId ? { ...node, data: { ...node.data, expanded: true } } : node),
      ...newNodes,
    ],
    edges: [...currentEdges, ...expansion.edges.filter((edge) => !edgeIds.has(edge.id))],
  };
}
