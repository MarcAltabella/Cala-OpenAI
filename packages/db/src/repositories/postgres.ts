import type {
  AgentRun,
  AgentRunPhase,
  CalaSnapshot,
  Company,
  FinanceImpact,
  GraphEntity,
  GraphRelationship,
  HealthcareGate,
  SourceDocument,
} from '@cala/contracts';
import { and, asc, eq, or } from 'drizzle-orm';
import { db } from '../client.js';
import { agentRuns, calaSnapshots, companies, entities, financeImpacts, healthcareGates, relationships, sourceDocuments } from '../schema.js';
import type { Repositories } from './types.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asUuid = (value: string | null | undefined): string | null => (value && UUID.test(value) ? value : null);
const iso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

function mapCompany(row: typeof companies.$inferSelect): Company {
  const recency = row.recency === 'high' ? 'high' : 'mid';
  return { id: row.id, name: row.name, ticker: row.ticker, displayOrder: row.displayOrder, recency, createdAt: iso(row.createdAt) ?? new Date().toISOString() };
}

function mapRun(row: typeof agentRuns.$inferSelect): AgentRun {
  return {
    id: row.id,
    companyId: row.companyId,
    mode: row.mode === 'seed' ? 'seed' : 'delta',
    status: (row.status as AgentRun['status']) ?? 'queued',
    phase: (row.phase as AgentRunPhase) ?? 'queued',
    startedAt: iso(row.startedAt),
    finishedAt: iso(row.finishedAt),
    error: row.error,
    counts: row.counts ?? {},
  };
}

function mapDocument(row: typeof sourceDocuments.$inferSelect): SourceDocument {
  return {
    id: row.id,
    companyId: row.companyId,
    provider: row.provider,
    providerId: row.providerId,
    url: row.url,
    publishedAt: iso(row.publishedAt),
    rawPayload: row.rawPayload,
    normalizedText: row.normalizedText,
    contentHash: row.contentHash,
    createdAt: iso(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapEntity(row: typeof entities.$inferSelect): GraphEntity {
  return { id: row.id, entityType: row.entityType, label: row.label, sourceId: row.sourceId };
}

function mapRelationship(row: typeof relationships.$inferSelect): GraphRelationship {
  return {
    id: row.id,
    fromEntityId: row.fromEntityId,
    toEntityId: row.toEntityId,
    relationshipType: row.relationshipType,
    evidenceDocumentId: row.evidenceDocumentId,
  };
}

export function createPostgresRepositories(): Repositories {
  return {
    companies: {
      async get(id) {
        const [row] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
        return row ? mapCompany(row) : undefined;
      },
      async list() {
        const rows = await db.select().from(companies).orderBy(asc(companies.displayOrder), asc(companies.name));
        return rows.map(mapCompany);
      },
      async create(input) {
        const existing = await db.select().from(companies);
        const [row] = await db
          .insert(companies)
          .values({ name: input.name, ticker: input.ticker, displayOrder: existing.length, recency: existing.length % 2 === 0 ? 'high' : 'mid' })
          .returning();
        return mapCompany(row);
      },
    },
    runs: {
      async get(id) {
        const [row] = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
        return row ? mapRun(row) : undefined;
      },
      async create(input) {
        const [row] = await db
          .insert(agentRuns)
          .values({
            companyId: asUuid(input.companyId ?? null),
            mode: input.mode,
            status: 'queued',
            phase: 'queued',
            counts: { calaHealthcare: 0, documents: 0, gate: 0, finance: 0 },
          })
          .returning();
        return mapRun(row);
      },
      async update(id, patch) {
        const [row] = await db
          .update(agentRuns)
          .set({
            ...(patch.companyId !== undefined ? { companyId: asUuid(patch.companyId) } : {}),
            ...(patch.mode !== undefined ? { mode: patch.mode } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.phase !== undefined ? { phase: patch.phase } : {}),
            ...(patch.startedAt !== undefined ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null } : {}),
            ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : null } : {}),
            ...(patch.error !== undefined ? { error: patch.error } : {}),
            ...(patch.counts !== undefined ? { counts: patch.counts } : {}),
          })
          .where(eq(agentRuns.id, id))
          .returning();
        return row ? mapRun(row) : undefined;
      },
    },
    documents: {
      async upsert(input) {
        const [existing] = await db
          .select()
          .from(sourceDocuments)
          .where(and(eq(sourceDocuments.provider, input.provider), eq(sourceDocuments.providerId, input.providerId)))
          .limit(1);
        if (existing) return { record: mapDocument(existing), isNew: false };
        const [row] = await db
          .insert(sourceDocuments)
          .values({
            companyId: asUuid(input.companyId),
            provider: input.provider,
            providerId: input.providerId,
            url: input.url ?? null,
            publishedAt: input.publishedAt && !Number.isNaN(new Date(input.publishedAt).getTime()) ? new Date(input.publishedAt) : null,
            rawPayload: (input.rawPayload ?? {}) as Record<string, unknown>,
            normalizedText: input.normalizedText ?? '',
            contentHash: input.contentHash,
          })
          .returning();
        return { record: mapDocument(row), isNew: true };
      },
      async listByCompany(companyId) {
        const rows = await db.select().from(sourceDocuments).where(eq(sourceDocuments.companyId, companyId));
        return rows.map(mapDocument);
      },
    },
    entities: {
      async upsert(input) {
        const externalId = input.externalId ?? `${input.entityType}:${input.label}`;
        const [existing] = await db
          .select()
          .from(entities)
          .where(and(eq(entities.entityType, input.entityType), eq(entities.externalId, externalId)))
          .limit(1);
        if (existing) return { record: mapEntity(existing), isNew: false };
        const [row] = await db
          .insert(entities)
          .values({
            entityType: input.entityType,
            externalId,
            label: input.label,
            sourceId: asUuid(input.sourceId),
            properties: {},
          })
          .returning();
        return { record: mapEntity(row), isNew: true };
      },
      async listByCompany(companyId) {
        const rows = await db
          .select()
          .from(entities)
          .where(or(eq(entities.sourceId, companyId), and(eq(entities.entityType, 'company'), eq(entities.sourceId, companyId))));
        return rows.map(mapEntity);
      },
    },
    relationships: {
      async upsert(input) {
        const [existing] = await db
          .select()
          .from(relationships)
          .where(
            and(
              eq(relationships.fromEntityId, input.fromEntityId),
              eq(relationships.relationshipType, input.relationshipType),
              eq(relationships.toEntityId, input.toEntityId),
            ),
          )
          .limit(1);
        if (existing) return { record: mapRelationship(existing), isNew: false };
        const [row] = await db
          .insert(relationships)
          .values({
            fromEntityId: input.fromEntityId,
            toEntityId: input.toEntityId,
            relationshipType: input.relationshipType,
            evidenceDocumentId: asUuid(input.evidenceDocumentId),
          })
          .returning();
        return { record: mapRelationship(row), isNew: true };
      },
      async listAll() {
        const rows = await db.select().from(relationships);
        return rows.map(mapRelationship);
      },
    },
    calaSnapshots: {
      async insert(input) {
        const [row] = await db
          .insert(calaSnapshots)
          .values({
            companyId: asUuid(input.companyId),
            runId: asUuid(input.runId),
            kind: input.kind,
            input: input.input,
            entities: input.entities,
            results: input.results,
          })
          .returning();
        const created: CalaSnapshot = {
          id: row.id,
          companyId: row.companyId,
          runId: row.runId,
          kind: row.kind as CalaSnapshot['kind'],
          input: row.input,
          entities: row.entities as CalaSnapshot['entities'],
          results: row.results as CalaSnapshot['results'],
          createdAt: iso(row.createdAt) ?? new Date().toISOString(),
        };
        return created;
      },
    },
    healthcareGates: {
      async insert(input) {
        const [row] = await db
          .insert(healthcareGates)
          .values({
            runId: asUuid(input.runId),
            companyId: asUuid(input.companyId),
            isNew: input.isNew,
            isRelevant: input.isRelevant,
            relevanceScore: String(input.relevanceScore),
            rationale: input.rationale,
            developmentSummary: input.developmentSummary,
          })
          .returning();
        const created: HealthcareGate = {
          id: row.id,
          isNew: row.isNew,
          isRelevant: row.isRelevant,
          relevanceScore: Number(row.relevanceScore),
          rationale: row.rationale,
          developmentSummary: row.developmentSummary,
        };
        return created;
      },
    },
    financeImpacts: {
      async insert(input) {
        const [row] = await db
          .insert(financeImpacts)
          .values({
            runId: asUuid(input.runId),
            companyId: asUuid(input.companyId),
            developmentSummary: input.developmentSummary,
            potentialProductOrCatalyst: input.potentialProductOrCatalyst,
            expectedImpact: input.expectedImpact,
            rationale: input.rationale,
            evidenceIds: input.evidenceIds,
          })
          .returning();
        const created: FinanceImpact = {
          id: row.id,
          developmentSummary: row.developmentSummary,
          potentialProductOrCatalyst: row.potentialProductOrCatalyst,
          expectedImpact: row.expectedImpact as FinanceImpact['expectedImpact'],
          rationale: row.rationale,
          evidenceIds: row.evidenceIds,
        };
        return created;
      },
    },
  };
}
