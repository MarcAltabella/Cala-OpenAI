import type { GraphEntity, GraphRelationship } from '@cala/contracts';
import neo4j, { type Driver } from 'neo4j-driver';
import { FULL_GRAPH, MERGE_ENTITY, MERGE_RELATIONSHIP, NEIGHBORHOOD } from './queries.js';
import type { GraphProjector, Neighborhood, NeighborhoodInput } from './types.js';

function focusId(input: NeighborhoodInput): string | undefined {
  return input.nodeId ?? input.companyId ?? input.personId ?? input.institutionId;
}

// In-memory test projector. Idempotent on id.
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
    const seed = focusId(input);
    const limit = input.limit ?? 100;
    const seedNode = seed ? [...this.nodes.values()].find((n) => n.id === seed || n.sourceId === seed) : undefined;
    const seedKey = seedNode?.id ?? seed;
    const query = input.query?.toLocaleLowerCase();
    const relationshipTypes = input.relationshipTypes ?? input.types;
    const matchesQuery = (node: GraphEntity) => !query || node.id === seedKey || node.label.toLocaleLowerCase().includes(query);
    const matchesType = (node: GraphEntity, always = false) => always || !input.entityTypes || input.entityTypes.includes(node.entityType);
    if (!seedKey) {
      const nodes = [...this.nodes.values()].filter((node) => matchesType(node) && matchesQuery(node));
      const visible = new Set(nodes.map((node) => node.id));
      const edges = [...this.edges.values()].filter((edge) => {
        const typed = !relationshipTypes || relationshipTypes.includes(edge.relationshipType);
        return typed && visible.has(edge.fromEntityId) && visible.has(edge.toEntityId);
      });
      return { nodes: nodes.slice(0, limit), edges: edges.slice(0, limit) };
    }
    const edges = [...this.edges.values()].filter((e) => {
      const touches = e.fromEntityId === seedKey || e.toEntityId === seedKey;
      const typed = !relationshipTypes || relationshipTypes.includes(e.relationshipType);
      return touches && typed;
    });
    const nodeIds = new Set<string>(seedNode ? [seedNode.id] : []);
    for (const e of edges) {
      nodeIds.add(e.fromEntityId);
      nodeIds.add(e.toEntityId);
    }
    const nodes = [...this.nodes.values()].filter((n) => {
      if (!nodeIds.has(n.id)) return false;
      if (n.id !== seedKey && !matchesType(n)) return false;
      return matchesQuery(n);
    });
    const visible = new Set(nodes.map((node) => node.id));
    return { nodes: nodes.slice(0, limit), edges: edges.filter((edge) => visible.has(edge.fromEntityId) && visible.has(edge.toEntityId)).slice(0, limit) };
  }
  async verifyConnectivity(): Promise<void> {}
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
    const seed = focusId(input) ?? null;
    try {
      const result = await session.run(seed ? NEIGHBORHOOD : FULL_GRAPH, {
        seedId: seed,
        entityTypes: input.entityTypes ?? null,
        relationshipTypes: input.relationshipTypes ?? input.types ?? null,
        query: input.query ?? null,
        limit: neo4j.int(input.limit ?? (seed ? 100 : 100_000)),
      });
      const nodes = new Map<string, GraphEntity>();
      const edges = new Map<string, GraphRelationship>();
      const readEntity = (value: { properties?: GraphEntity } | undefined) => {
        const props = value?.properties;
        if (props?.id) nodes.set(props.id, { id: props.id, entityType: props.entityType, label: props.label, sourceId: props.sourceId ?? null });
        return props;
      };
      for (const record of result.records) {
        const value = (key: string) => record.keys.includes(key) ? record.get(key) : undefined;
        readEntity(value('seed'));
        readEntity(value('other'));
        const from = readEntity(value('from')) ?? readEntity(value('relFrom'));
        const to = readEntity(value('to')) ?? readEntity(value('relTo'));
        const rel = value('r')?.properties as GraphRelationship | undefined;
        if (rel?.id) {
          edges.set(rel.id, {
            id: rel.id,
            fromEntityId: rel.fromEntityId ?? from?.id ?? '',
            toEntityId: rel.toEntityId ?? to?.id ?? '',
            relationshipType: rel.relationshipType,
            evidenceDocumentId: rel.evidenceDocumentId ?? null,
          });
        }
      }
      return { nodes: [...nodes.values()], edges: [...edges.values()].filter((edge) => edge.fromEntityId && edge.toEntityId) };
    } finally {
      await session.close();
    }
  }
  async verifyConnectivity(): Promise<void> {
    await this.driver.verifyConnectivity();
  }
  async close(): Promise<void> {
    await this.driver.close();
  }
}

// Build the production projector from environment.
export function createGraphFromEnv(): GraphProjector {
  const uri = process.env.NEO4J_URI;
  if (!uri && process.env.VITEST) return new InMemoryGraph();
  if (!uri) throw new Error('NEO4J_URI is required to create the Neo4j graph projector');
  return new Neo4jGraph({ uri, user: process.env.NEO4J_USER ?? 'neo4j', password: process.env.NEO4J_PASSWORD ?? 'neo4j' });
}
