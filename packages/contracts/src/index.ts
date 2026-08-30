export type CompanyRecency = 'mid' | 'high';
export type Company = { id: string; name: string; ticker: string | null; displayOrder: number; recency: CompanyRecency; createdAt: string };
export type EntityType = 'company' | 'person' | 'institution' | 'paper' | 'patent' | 'clinical_trial' | 'news';
export type Entity = { id: string; type: EntityType; externalId: string | null; label: string; properties: Record<string, unknown>; sourceId?: string | null };
export type Person = Entity & { type: 'person' }; export type Institution = Entity & { type: 'institution' };
export type SourceDocument = { id: string; companyId: string | null; provider: string; providerId: string; url: string | null; publishedAt: string | null; rawPayload: unknown; normalizedText: string; contentHash: string; createdAt: string };
export type Relationship = { id: string; type: string; fromEntityId: string; toEntityId: string; sourceDocumentId: string | null; evidenceUrl: string | null; confidence: number };
export type Development = { id: string; companyId: string; sourceDocumentId: string; summary: string; relevanceScore: number; status: 'new' | 'analyzed' | 'dismissed'; createdAt: string };
export type FinanceAnalysis = { id: string; developmentId: string; marketSnapshot: unknown; impact: string; confidence: number; rationale: string; createdAt: string };
export type AgentRunPhase = 'queued' | 'fanout' | 'relations' | 'healthcare_gate' | 'stopped' | 'finance' | 'completed' | 'failed';
export type AgentPhase = AgentRunPhase;
export type AgentRun = { id: string; companyId: string | null; mode: 'delta'; status: 'queued' | 'running' | 'completed' | 'failed'; phase: AgentRunPhase; startedAt: string | null; finishedAt: string | null; error: string | null; counts: Record<string, number> };
export type DailyReport = { id: string; reportDate: string; summary: string; createdAt: string };
export type GraphEntity = { id: string; entityType: string; label: string; sourceId: string | null };
export type GraphRelationship = { id: string; fromEntityId: string; toEntityId: string; relationshipType: string; evidenceDocumentId: string | null };
export type RunInput = { companyId?: string; mode?: 'delta' };
export type MomentumReport = { companyId: string; thesis: string; events: Array<{ entityId: string; summary: string; occurredAt: string }>; generatedAt: string };
export type RunEvent = { id: string; runId: string; phase: AgentRunPhase; kind: 'phase' | 'tool_call' | 'tool_result' | 'error'; tool: string | null; input?: Record<string, unknown>; output?: Record<string, unknown>; summary: string | null; createdAt: string };

// Cala knowledge-query snapshots (see POST https://api.cala.ai/v1/knowledge/query)
export type CalaEntity = { id: string; entityType: string; name: string; mentions: string[] };
export type CalaSnapshotKind = 'healthcare' | 'finance';
export type CalaSnapshot = {
  id: string;
  companyId: string | null;
  runId?: string | null;
  kind: CalaSnapshotKind;
  input: string;
  entities: CalaEntity[];
  results: Record<string, unknown>[];
  createdAt: string;
};

// Fastino Healthcare gate output
export type HealthcareGate = {
  id?: string;
  isNew: boolean;
  isRelevant: boolean;
  relevanceScore: number;
  rationale: string;
  developmentSummary: string;
};

// Fastino Finance impact output
export type ExpectedImpact = {
  direction: 'up' | 'down' | 'unclear';
  magnitude: 'low' | 'medium' | 'high';
  horizon: string;
  confidence: number;
};
export type FinanceImpact = {
  id?: string;
  developmentSummary: string;
  potentialProductOrCatalyst: string;
  expectedImpact: ExpectedImpact;
  rationale: string;
  evidenceIds: string[];
};

// Compact graph neighborhood passed to the healthcare/finance models
export type RelationPack = {
  companyId: string;
  brief: string;
  nodes: GraphEntity[];
  edges: GraphRelationship[];
};
