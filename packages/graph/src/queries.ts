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
SET r.relationshipType = $relationshipType,
    r.evidenceDocumentId = $evidenceDocumentId,
    r.fromEntityId = $fromEntityId,
    r.toEntityId = $toEntityId
`;

// One-hop neighborhood around a focused entity, optionally filtered by relationship type.
export const NEIGHBORHOOD = `
MATCH (seed:Entity)-[r:REL]-(other:Entity)
WHERE ($seedId IS NULL OR seed.id = $seedId OR seed.sourceId = $seedId)
  AND ($entityTypes IS NULL OR other.entityType IN $entityTypes)
  AND ($relationshipTypes IS NULL OR r.relationshipType IN $relationshipTypes)
  AND ($query IS NULL OR toLower(seed.label) CONTAINS toLower($query) OR toLower(other.label) CONTAINS toLower($query))
RETURN seed, r, other, startNode(r) AS relFrom, endNode(r) AS relTo
LIMIT $limit
`;

// Entire projected graph, including companies with no evidence yet.
export const FULL_GRAPH = `
MATCH (from:Entity)
WHERE ($entityTypes IS NULL OR from.entityType IN $entityTypes)
  AND ($query IS NULL OR toLower(from.label) CONTAINS toLower($query))
OPTIONAL MATCH (from)-[r:REL]->(to:Entity)
WHERE ($relationshipTypes IS NULL OR r.relationshipType IN $relationshipTypes)
  AND ($entityTypes IS NULL OR to.entityType IN $entityTypes)
  AND ($query IS NULL OR toLower(to.label) CONTAINS toLower($query))
RETURN from, r, to
LIMIT $limit
`;
