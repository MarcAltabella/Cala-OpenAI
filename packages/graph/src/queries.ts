// Cypher used by the Neo4j projector. Entities and relationships are merged on
// their PostgreSQL ids so Postgres stays the source of truth and projection is
// idempotent. No route ever accepts raw Cypher from callers.
export const MERGE_ENTITY = `
MERGE (e:Entity { id: $id })
SET e.entityType = $entityType, e.label = $label, e.sourceId = $sourceId
`;

export const MERGE_RELATIONSHIP = `
MATCH (from:Entity { id: $fromEntityId })
MATCH (to:Entity { id: $toEntityId })
MERGE (from)-[r:REL { id: $id }]->(to)
SET r.relationshipType = $relationshipType, r.evidenceDocumentId = $evidenceDocumentId
`;

// One-hop neighborhood around a seed entity, optionally filtered by relationship type.
export const NEIGHBORHOOD = `
MATCH (seed:Entity { id: $seedId })-[r:REL]-(other:Entity)
WHERE ($types IS NULL OR r.relationshipType IN $types)
  AND ($query IS NULL OR toLower(seed.label) CONTAINS toLower($query) OR toLower(other.label) CONTAINS toLower($query))
RETURN seed, r, other
LIMIT $limit
`;
