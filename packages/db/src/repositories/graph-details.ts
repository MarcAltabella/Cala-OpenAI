import { eq, inArray, or } from 'drizzle-orm';
import { db } from '../client.js';
import { companies, entities, relationships, sourceDocuments } from '../schema.js';

export async function getGraphEntityDetail(id: string) {
  const [entity] = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
  if (!entity) return undefined;

  const connected = await db
    .select()
    .from(relationships)
    .where(or(eq(relationships.fromEntityId, id), eq(relationships.toEntityId, id)));
  const evidenceIds = [...new Set(connected.map((edge) => edge.evidenceDocumentId).filter((value): value is string => Boolean(value)))];
  const evidence = evidenceIds.length
    ? await db.select().from(sourceDocuments).where(inArray(sourceDocuments.id, evidenceIds))
    : [];

  const [sourceDocument] = entity.sourceId
    ? await db.select().from(sourceDocuments).where(eq(sourceDocuments.id, entity.sourceId)).limit(1)
    : [];
  const [company] = entity.entityType === 'company' && entity.sourceId
    ? await db.select().from(companies).where(eq(companies.id, entity.sourceId)).limit(1)
    : [];

  const safeDocument = (document: typeof sourceDocuments.$inferSelect | undefined) =>
    document
      ? {
          id: document.id,
          provider: document.provider,
          providerId: document.providerId,
          url: document.url,
          publishedAt: document.publishedAt?.toISOString() ?? null,
          excerpt: document.normalizedText.slice(0, 420),
        }
      : null;

  return {
    entity: {
      id: entity.id,
      entityType: entity.entityType,
      externalId: entity.externalId,
      label: entity.label,
      properties: entity.properties,
      sourceId: entity.sourceId,
    },
    company: company
      ? {
          id: company.id,
          name: company.name,
          ticker: company.ticker,
          displayOrder: company.displayOrder,
          recency: company.recency === 'high' ? 'high' : 'mid',
          createdAt: company.createdAt?.toISOString?.() ?? new Date().toISOString(),
        }
      : null,
    document: safeDocument(sourceDocument),
    relationships: connected.map((edge) => ({
      id: edge.id,
      fromEntityId: edge.fromEntityId,
      toEntityId: edge.toEntityId,
      relationshipType: edge.relationshipType,
      evidenceDocumentId: edge.evidenceDocumentId,
      evidenceUrl: edge.evidenceUrl,
      confidence: Number(edge.confidence),
    })),
    evidence: evidence.map(safeDocument).filter(Boolean),
  };
}
