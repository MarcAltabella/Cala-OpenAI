import type { GraphEntity, GraphRelationship } from '@cala/contracts';
import neo4j, { type Driver } from 'neo4j-driver';
import { MERGE_ENTITY, MERGE_RELATIONSHIP, NEIGHBORHOOD } from './queries.js';
import type { GraphProjector, Neighborhood, NeighborhoodInput } from './types.js';

function seedId(input: NeighborhoodInput): string | undefined {
  return input.companyId ?? input.personId ?? input.institutionId;
}

// In-memory fake driver for unit tests and offline demo runs. Idempotent on id.
export class InMemoryGraph implements GraphProjector {
  private readonly nodes = new Map<string, GraphEntity>();
  private readonly edges = new Map<string, GraphRelationship>();

  async projectEntity(entity: GraphEntity): Promise<void> {
    this.nodes.set(entity.id, { ...entity });
  }
  async projectRelationship(relationship: GraphRelationship): Promise<void> {
    this.edges.set(relationship.id, { ...relationship });
  }
  async neighborhood(input: NeighborhoodInput): Promise<Neighborhood> {
    const seed = seedId(input);
    const limit = input.limit ?? 100;
    const seedNode = seed ? [...this.nodes.values()].find((n) => n.id === seed || n.sourceId === seed) : undefined;
    const seedKey = seedNode?.id ?? seed;
    const edges = [...this.edges.values()].filter((e) => {
      const touches = !seedKey || e.fromEntityId === seedKey || e.toEntityId === seedKey;
      const typed = !input.types || input.types.includes(e.relationshipType);
      return touches && typed;
    });
    const nodeIds = new Set<string>();
    if (seedNode) nodeIds.add(seedNode.id);
    for (const e of edges) {
      nodeIds.add(e.fromEntityId);
      nodeIds.add(e.toEntityId);
    }
    const nodes = [...this.nodes.values()].filter((n) => nodeIds.has(n.id));
    return { nodes: nodes.slice(0, limit), edges: edges.slice(0, limit) };
  }
  async close(): Promise<void> {}

  // Test-only helpers.
  relationshipCount(type?: string): number {
    if (!type) return this.edges.size;
    return [...this.edges.values()].filter((e) => e.relationshipType === type).length;
  }
  entityCount(): number {
    return this.nodes.size;
  }
}

// Neo4j-backed projector. Uses MERGE on PostgreSQL ids for idempotency.
export class Neo4jGraph implements GraphProjector {
  private readonly driver: Driver;
  constructor(options: { uri: string; user: string; password: string }) {
    this.driver = neo4j.driver(options.uri, neo4j.auth.basic(options.user, options.password));
  }
  async projectEntity(entity: GraphEntity): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(MERGE_ENTITY, entity);
    } finally {
      await session.close();
    }
  }
  async projectRelationship(relationship: GraphRelationship): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(MERGE_RELATIONSHIP, relationship);
    } finally {
      await session.close();
    }
  }
  async neighborhood(input: NeighborhoodInput): Promise<Neighborhood> {
    const session = this.driver.session();
    try {
      const result = await session.run(NEIGHBORHOOD, { seedId: seedId(input) ?? null, types: input.types ?? null, limit: neo4j.int(input.limit ?? 100) });
      const nodes = new Map<string, GraphEntity>();
      const edges = new Map<string, GraphRelationship>();
      for (const record of result.records) {
        for (const key of ['seed', 'other']) {
          const props = record.get(key)?.properties as GraphEntity | undefined;
          if (props?.id) nodes.set(props.id, { id: props.id, entityType: props.entityType, label: props.label, sourceId: props.sourceId ?? null });
        }
        const rel = record.get('r')?.properties as GraphRelationship | undefined;
        if (rel?.id) edges.set(rel.id, { id: rel.id, fromEntityId: rel.fromEntityId, toEntityId: rel.toEntityId, relationshipType: rel.relationshipType, evidenceDocumentId: rel.evidenceDocumentId ?? null });
      }
      return { nodes: [...nodes.values()], edges: [...edges.values()] };
    } finally {
      await session.close();
    }
  }
  async close(): Promise<void> {
    await this.driver.close();
  }
}

// Build a projector from env; falls back to the in-memory fake when NEO4J_URI is unset.
export function createGraphFromEnv(): GraphProjector {
  const uri = process.env.NEO4J_URI;
  if (!uri) return new InMemoryGraph();
  return new Neo4jGraph({ uri, user: process.env.NEO4J_USER ?? 'neo4j', password: process.env.NEO4J_PASSWORD ?? 'neo4j' });
}
