import type { Entity, Relationship } from '@cala/contracts';
export type GraphReader = (filters: { companyId?: string; types?: string[]; personId?: string; institutionId?: string }) => Promise<{ nodes: Entity[]; edges: Relationship[] }>;
export const neighborhood: GraphReader = async () => ({ nodes: [], edges: [] });
