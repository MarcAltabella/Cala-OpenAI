import type {
  AgentRun,
  CalaSnapshot,
  Company,
  FinanceImpact,
  GraphEntity,
  GraphRelationship,
  HealthcareGate,
  SourceDocument,
} from '@cala/contracts';
import { randomUUID } from 'node:crypto';
import type { Repositories } from './types.js';

export type InMemoryStore = {
  companies: Map<string, Company>;
  runs: Map<string, AgentRun>;
  documents: Map<string, SourceDocument>;
  entities: Map<string, GraphEntity>;
  relationships: Map<string, GraphRelationship>;
  calaSnapshots: CalaSnapshot[];
  healthcareGates: HealthcareGate[];
  financeImpacts: FinanceImpact[];
};

export function createInMemoryStore(seed?: { companies?: Company[] }): InMemoryStore {
  const companies = new Map<string, Company>();
  for (const company of seed?.companies ?? []) companies.set(company.id, company);
  return {
    companies,
    runs: new Map(),
    documents: new Map(),
    entities: new Map(),
    relationships: new Map(),
    calaSnapshots: [],
    healthcareGates: [],
    financeImpacts: [],
  };
}

// Repositories backed by an in-memory store. Used by tests and the local demo
// so the workflow can run without Postgres.
export function createInMemoryRepositories(store: InMemoryStore = createInMemoryStore()): Repositories & { store: InMemoryStore } {
  return {
    store,
    companies: {
      async get(id) {
        return store.companies.get(id);
      },
      async list() {
        return [...store.companies.values()].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
      },
    },
    runs: {
      async get(id) {
        return store.runs.get(id);
      },
      async update(id, patch) {
        const run = store.runs.get(id);
        const base: AgentRun =
          run ?? { id, companyId: null, mode: 'delta', status: 'queued', phase: 'queued', startedAt: null, finishedAt: null, error: null, counts: {} };
        const next = { ...base, ...patch };
        store.runs.set(id, next);
        return next;
      },
    },
    documents: {
      async upsert(input) {
        const key = `${input.provider}:${input.providerId}`;
        const existing = store.documents.get(key);
        if (existing) return { record: existing, isNew: false };
        const record: SourceDocument = {
          id: randomUUID(),
          companyId: input.companyId ?? null,
          provider: input.provider,
          providerId: input.providerId,
          url: input.url ?? null,
          publishedAt: input.publishedAt ?? null,
          rawPayload: input.rawPayload ?? {},
          normalizedText: input.normalizedText ?? '',
          contentHash: input.contentHash,
          createdAt: new Date().toISOString(),
        };
        store.documents.set(key, record);
        return { record, isNew: true };
      },
      async listByCompany(companyId) {
        return [...store.documents.values()].filter((d) => d.companyId === companyId);
      },
    },
    entities: {
      async upsert(input) {
        const key = `${input.entityType}:${input.label}`;
        for (const existing of store.entities.values()) {
          if (`${existing.entityType}:${existing.label}` === key) return { record: existing, isNew: false };
        }
        const record: GraphEntity = { id: randomUUID(), entityType: input.entityType, label: input.label, sourceId: input.sourceId ?? null };
        store.entities.set(record.id, record);
        return { record, isNew: true };
      },
      async listByCompany(companyId) {
        return [...store.entities.values()].filter((e) => e.sourceId === companyId || e.entityType === 'company');
      },
    },
    relationships: {
      async upsert(input) {
        const key = `${input.fromEntityId}:${input.relationshipType}:${input.toEntityId}`;
        for (const existing of store.relationships.values()) {
          if (`${existing.fromEntityId}:${existing.relationshipType}:${existing.toEntityId}` === key) return { record: existing, isNew: false };
        }
        const record: GraphRelationship = {
          id: randomUUID(),
          fromEntityId: input.fromEntityId,
          toEntityId: input.toEntityId,
          relationshipType: input.relationshipType,
          evidenceDocumentId: input.evidenceDocumentId ?? null,
        };
        store.relationships.set(record.id, record);
        return { record, isNew: true };
      },
      async listAll() {
        return [...store.relationships.values()];
      },
    },
    calaSnapshots: {
      async insert(input) {
        const record: CalaSnapshot = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
        store.calaSnapshots.push(record);
        return record;
      },
    },
    healthcareGates: {
      async insert(input) {
        const record: HealthcareGate = { ...input, id: input.id ?? randomUUID() };
        store.healthcareGates.push(record);
        return record;
      },
    },
    financeImpacts: {
      async insert(input) {
        const record: FinanceImpact = { ...input, id: input.id ?? randomUUID() };
        store.financeImpacts.push(record);
        return record;
      },
    },
  };
}
