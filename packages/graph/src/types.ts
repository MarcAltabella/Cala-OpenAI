import type { GraphEntity, GraphRelationship } from '@cala/contracts';

export type NeighborhoodInput = {
  companyId?: string;
  personId?: string;
  institutionId?: string;
  types?: string[];
  limit?: number;
};

export type Neighborhood = { nodes: GraphEntity[]; edges: GraphRelationship[] };

// Read-model projector. Implemented by Neo4j (production) and an in-memory fake
// (tests). Projection is idempotent: the same entity/relationship id merges once.
export interface GraphProjector {
  projectEntity(entity: GraphEntity): Promise<void>;
  projectRelationship(relationship: GraphRelationship): Promise<void>;
  neighborhood(input: NeighborhoodInput): Promise<Neighborhood>;
  close(): Promise<void>;
}
