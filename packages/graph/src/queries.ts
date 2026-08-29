import type { Entity, Relationship } from '@cala/contracts';
import { listEntities, listRelationships } from '@cala/db/src/repositories/entities.js';
export type GraphReader = (filters: { companyId?: string; types?: string[]; query?: string; personId?: string; institutionId?: string }) => Promise<{ nodes: Entity[]; edges: Relationship[] }>;
export const neighborhood: GraphReader = async ({ companyId, types, query, personId, institutionId }) => {
  const keyword = query?.toLocaleLowerCase();
  const nodes = listEntities().filter(node => (!types?.length || types.includes(node.type)) && (!companyId || node.properties.companyId === companyId || node.id === companyId) && (!personId || node.id === personId) && (!institutionId || node.id === institutionId) && (!keyword || `${node.label} ${JSON.stringify(node.properties)}`.toLocaleLowerCase().includes(keyword)));
  const nodeIds = new Set(nodes.map(node => node.id));
  const edges = listRelationships().filter(edge => nodeIds.has(edge.fromEntityId) && nodeIds.has(edge.toEntityId));
  return { nodes, edges };
};
