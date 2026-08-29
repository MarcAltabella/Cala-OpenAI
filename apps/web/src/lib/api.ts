export type Company = { id: string; name: string; ticker: string | null; displayOrder: number; recency?: 'mid' | 'high' };
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';
export type RunPhase = 'queued' | 'fanout' | 'relations' | 'healthcare_gate' | 'stopped' | 'finance' | 'completed' | 'failed';
export type Run = { id: string; companyId: string | null; mode: 'seed' | 'delta'; status: RunStatus; phase: RunPhase; startedAt: string | null; finishedAt: string | null; error: string | null; counts: Record<string, number> };
export type RunEvent = { id: string; runId?: string; phase: RunPhase; kind: 'phase' | 'tool_call' | 'tool_result' | 'error'; tool: string | null; summary: string | null; input?: Record<string, unknown>; output?: Record<string, unknown>; createdAt: string };
export type QueuedRun = { id: string; status: 'queued' };
export type GraphEntity = { id: string; entityType: string; label: string; sourceId: string | null };
export type GraphRelationship = { id: string; fromEntityId: string; toEntityId: string; relationshipType: string; evidenceDocumentId: string | null };
export type GraphNeighborhood = { nodes: GraphEntity[]; edges: GraphRelationship[] };
export type GraphDocument = { id: string; provider: string; providerId: string; url: string | null; publishedAt: string | null; excerpt: string };
export type GraphEntityDetail = {
  entity: GraphEntity & { externalId: string | null; properties: Record<string, unknown> };
  company: Company | null;
  document: GraphDocument | null;
  relationships: Array<GraphRelationship & { evidenceUrl: string | null; confidence: number }>;
  evidence: GraphDocument[];
};
export type ServiceHealth = { status: 'ok' | 'degraded'; postgres: 'connected' | 'unavailable'; neo4j: 'connected' | 'unavailable' };

const API_BASE_URL = (((import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) ?? '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${path}`);
  return response.json() as Promise<T>;
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(apiUrl(url));
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? `Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function listCompanies() { return json<Company[]>('/companies'); }
export async function listCompanyRuns(companyId: string) { return json<Run[]>(`/companies/${encodeURIComponent(companyId)}/agent-runs`); }
export async function createAgentRun(companyId: string, mode: 'seed' | 'delta' = 'delta') { return requestJson<QueuedRun>('/runs', { method: 'POST', body: JSON.stringify({ companyId, mode }) }); }
export async function getRun(runId: string) { return requestJson<Run>(`/runs/${encodeURIComponent(runId)}`); }
export async function getRunEvents(runId: string) { return requestJson<RunEvent[]>(`/runs/${encodeURIComponent(runId)}/events`); }

export async function getKnowledgeGraph(filters: {
  companyId?: string;
  nodeId?: string;
  entityTypes?: string[];
  relationshipTypes?: string[];
  query?: string;
  limit?: number;
}): Promise<GraphNeighborhood> {
  const params = new URLSearchParams();
  if (filters.companyId) params.set('companyId', filters.companyId);
  if (filters.nodeId) params.set('nodeId', filters.nodeId);
  if (filters.entityTypes?.length) params.set('entityTypes', filters.entityTypes.join(','));
  if (filters.relationshipTypes?.length) params.set('relationshipTypes', filters.relationshipTypes.join(','));
  if (filters.query) params.set('query', filters.query);
  if (filters.limit) params.set('limit', String(filters.limit));
  return json<GraphNeighborhood>(`/knowledge-graph?${params}`);
}

export const getGraphEntityDetail = (id: string) => json<GraphEntityDetail>(`/knowledge-graph/entities/${encodeURIComponent(id)}`);
export const getServiceHealth = () => json<ServiceHealth>('/health');

export type GraphAskFilter = {
  allCompanies?: boolean;
  companyTicker?: string | null;
  companyName?: string | null;
  entityTypes?: string[];
  relationshipTypes?: string[];
  labelQuery?: string | null;
};

export type GraphSqlResult = {
  question: string;
  sql: string;
  explanation: string;
  rows: Record<string, unknown>[];
  rowCount: number;
  graphFilter?: GraphAskFilter;
};

export async function askGraphSql(question: string): Promise<GraphSqlResult> {
  const response = await fetch(apiUrl('/knowledge-graph/sql'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  const payload = await response.json().catch(() => null) as (GraphSqlResult & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? `SQL agent failed (${response.status})`);
  return payload as GraphSqlResult;
}
