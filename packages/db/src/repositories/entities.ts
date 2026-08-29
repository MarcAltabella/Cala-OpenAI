import type { Entity, EntityType, Relationship } from '@cala/contracts';
import { randomUUID } from 'node:crypto';

const entities = new Map<string, Entity>();
const relationships: Relationship[] = [];

export function insertEntity(input: { type: EntityType; externalId?: string | null; label?: string; properties?: Record<string, unknown> }): Entity {
  if (input.externalId && [...entities.values()].some(entity => entity.type === input.type && entity.externalId === input.externalId)) throw new Error('duplicate entity external id');
  const entity: Entity = { id: randomUUID(), type: input.type, externalId: input.externalId ?? null, label: input.label ?? input.externalId ?? input.type, properties: input.properties ?? {} };
  entities.set(entity.id, entity);
  return entity;
}
export function getEntity(id: string): Entity | undefined { return entities.get(id); }
export function listEntities(type?: EntityType): Entity[] { return [...entities.values()].filter(entity => !type || entity.type === type); }
export function insertRelationship(input: Omit<Relationship, 'id'>): Relationship { const relationship = { id: randomUUID(), ...input }; relationships.push(relationship); return relationship; }
export function listRelationships(): Relationship[] { return [...relationships]; }
export function resetEntities(): void { entities.clear(); relationships.length = 0; }
