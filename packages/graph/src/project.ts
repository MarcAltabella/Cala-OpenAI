import type { GraphEntity, GraphRelationship } from '@cala/contracts';
import type { GraphProjector } from './types.js';

// Project a batch of entities then relationships (entities first so relationship
// endpoints exist). Idempotent because the projector merges on id.
export async function projectAll(
  projector: GraphProjector,
  input: { entities: GraphEntity[]; relationships: GraphRelationship[] },
): Promise<{ entities: number; relationships: number }> {
  for (const entity of input.entities) await projector.projectEntity(entity);
  for (const relationship of input.relationships) await projector.projectRelationship(relationship);
  return { entities: input.entities.length, relationships: input.relationships.length };
}
