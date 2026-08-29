import type { Company } from '@cala/contracts';
import type { Repositories } from '@cala/db';
import type { GraphProjector } from '@cala/graph';
import { SourceAdapterError, type DocumentKind } from '@cala/ingestion';
import type { EmbeddingModel } from './models.js';
import type { ResearchTool } from './tools.js';

export type ResearchDeps = {
  tools: ResearchTool[];
  repos: Repositories;
  graph: GraphProjector;
  embeddings?: EmbeddingModel;
};

export type ResearchResult = {
  documentIds: string[];
  entityIds: string[];
  relationshipIds: string[];
  documentSummaries: string[];
  errors: string[];
};

// How each document kind connects back to the company node.
const RELATION_BY_KIND: Record<DocumentKind, string> = {
  paper: 'RESEARCH_ON',
  patent: 'PATENT_OF',
  trial: 'TRIAL_BY',
  news: 'REPORTED_ON',
  filing: 'FILED_BY',
  label: 'LABELED_FOR',
  press: 'ANNOUNCED_BY',
};

// The research agent: run each tool, normalize + persist documents, upsert
// entities/relationships, embed new documents, and project everything to the
// graph BEFORE the relation/gate step. A failing tool is recorded and never
// aborts sibling tools or the Cala branch.
export async function runResearch(
  input: { company: Company; since?: Date },
  deps: ResearchDeps,
): Promise<ResearchResult> {
  const { company } = input;
  const since = input.since ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 365);
  const result: ResearchResult = { documentIds: [], entityIds: [], relationshipIds: [], documentSummaries: [], errors: [] };

  const companyEntity = await deps.repos.entities.upsert({ entityType: 'company', label: company.name, sourceId: company.id });
  result.entityIds.push(companyEntity.record.id);
  await deps.graph.projectEntity(companyEntity.record);

  for (const tool of deps.tools) {
    try {
      const documents = await tool.run({ company, since });
      const newTexts: string[] = [];
      for (const document of documents) {
        const upserted = await deps.repos.documents.upsert({
          companyId: company.id,
          provider: document.provider,
          providerId: document.providerId,
          url: document.url,
          publishedAt: document.publishedAt,
          rawPayload: document.rawPayload,
          normalizedText: document.text,
          contentHash: document.contentHash,
        });
        result.documentIds.push(upserted.record.id);
        result.documentSummaries.push(`${document.documentKind}: ${document.title}`);
        if (upserted.isNew) newTexts.push(document.text);

        const docEntity = await deps.repos.entities.upsert({ entityType: document.documentKind, label: document.title, sourceId: upserted.record.id });
        result.entityIds.push(docEntity.record.id);
        await deps.graph.projectEntity(docEntity.record);

        const relationship = await deps.repos.relationships.upsert({
          fromEntityId: docEntity.record.id,
          toEntityId: companyEntity.record.id,
          relationshipType: RELATION_BY_KIND[document.documentKind],
          evidenceDocumentId: upserted.record.id,
        });
        result.relationshipIds.push(relationship.record.id);
        await deps.graph.projectRelationship(relationship.record);
      }
      if (deps.embeddings && newTexts.length > 0) await deps.embeddings.embed(newTexts);
    } catch (error) {
      const provider = error instanceof SourceAdapterError ? error.provider : tool.name;
      result.errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return result;
}
