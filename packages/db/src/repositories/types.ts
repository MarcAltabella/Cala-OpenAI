import type {
  AgentRun,
  CalaSnapshot,
  Company,
  FinanceImpact,
  GraphEntity,
  GraphRelationship,
  HealthcareGate,
  RunInput,
  SourceDocument,
} from '@cala/contracts';

export type UpsertResult<T> = { record: T; isNew: boolean };

export type DocumentInput = Pick<SourceDocument, 'provider' | 'providerId' | 'contentHash'> & Partial<SourceDocument>;
export type EntityInput = { entityType: string; label: string; sourceId?: string | null; externalId?: string | null };
export type RelationshipInput = { fromEntityId: string; toEntityId: string; relationshipType: string; evidenceDocumentId?: string | null };
export type CalaSnapshotInput = Omit<CalaSnapshot, 'id' | 'createdAt'>;

export interface CompanyRepository {
  get(id: string): Promise<Company | undefined>;
  list(): Promise<Company[]>;
  create(input: { name: string; ticker: string | null }): Promise<Company>;
}
export interface RunRepository {
  get(id: string): Promise<AgentRun | undefined>;
  create(input: RunInput): Promise<AgentRun>;
  update(id: string, patch: Partial<Omit<AgentRun, 'id'>>): Promise<AgentRun | undefined>;
}
export interface DocumentRepository {
  upsert(input: DocumentInput): Promise<UpsertResult<SourceDocument>>;
  listByCompany(companyId: string): Promise<SourceDocument[]>;
}
export interface EntityRepository {
  upsert(input: EntityInput): Promise<UpsertResult<GraphEntity>>;
  listByCompany(companyId: string): Promise<GraphEntity[]>;
}
export interface RelationshipRepository {
  upsert(input: RelationshipInput): Promise<UpsertResult<GraphRelationship>>;
  listAll(): Promise<GraphRelationship[]>;
}
export interface CalaSnapshotRepository {
  insert(input: CalaSnapshotInput): Promise<CalaSnapshot>;
}
export interface HealthcareGateRepository {
  insert(input: HealthcareGate & { runId?: string; companyId?: string | null }): Promise<HealthcareGate>;
}
export interface FinanceImpactRepository {
  insert(input: FinanceImpact & { runId?: string; companyId?: string | null }): Promise<FinanceImpact>;
}

export interface Repositories {
  companies: CompanyRepository;
  runs: RunRepository;
  documents: DocumentRepository;
  entities: EntityRepository;
  relationships: RelationshipRepository;
  calaSnapshots: CalaSnapshotRepository;
  healthcareGates: HealthcareGateRepository;
  financeImpacts: FinanceImpactRepository;
}
