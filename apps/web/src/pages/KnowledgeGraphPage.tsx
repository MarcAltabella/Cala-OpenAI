import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import { ArrowUpRight, CalendarDays, Database, ExternalLink, Loader2, Network, Tag, X } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import {
  getGraphEntityDetail,
  getKnowledgeGraph,
  getServiceHealth,
  listCompanies,
  askGraphSql,
  type Company,
  type GraphAskFilter,
  type GraphEntityDetail,
  type GraphSqlResult,
  type ServiceHealth,
} from '../lib/api';
import {
  ENTITY_STYLES,
  RELATION_STYLES,
  layoutAllCompanies,
  layoutModernaScene,
  layoutNeighborhood,
  mergeExpansion,
  type KnowledgeNode,
} from '../lib/graph';
import { PromptBar } from '../components/PromptBar';

const GraphNode = memo(({ data, selected }: NodeProps<KnowledgeNode>) => (
  <div
    className={`knowledge-node knowledge-node-${data.entityType} ${data.isHub ? 'is-hub' : ''} ${data.isPartner ? 'is-partner' : ''} ${selected ? 'is-selected' : ''}`}
    style={{ '--node-color': data.color } as React.CSSProperties}
    title={data.label}
    role="button"
    tabIndex={0}
    aria-label={`${data.entityType}: ${data.label}`}
  >
    <Handle type="target" position={Position.Top} className="graph-handle" />
    <div className="knowledge-node-inner">
      <span className="knowledge-node-dot" />
      <strong>{data.shortLabel}</strong>
      <small>{ENTITY_STYLES[data.entityType]?.label ?? data.entityType.replaceAll('_', ' ')}</small>
    </div>
    <Handle type="source" position={Position.Bottom} className="graph-handle" />
  </div>
));

const nodeTypes = { knowledge: GraphNode };
const entityTypes = Object.keys(ENTITY_STYLES).filter((type) => type !== 'product');
const relationshipTypes = Object.keys(RELATION_STYLES);
const ALL_COMPANIES = 'all';

function formatSqlCell(value: unknown) {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function KnowledgeGraphPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GraphEntityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [activeTypes, setActiveTypes] = useState(() => new Set(entityTypes));
  const [activeRelationships, setActiveRelationships] = useState(() => new Set(relationshipTypes));
  const [loading, setLoading] = useState(true);
  const [expanding, setExpanding] = useState(false);
  const [error, setError] = useState('');
  const [sqlBusy, setSqlBusy] = useState(false);
  const [sqlResult, setSqlResult] = useState<GraphSqlResult | null>(null);
  const [sqlError, setSqlError] = useState('');
  const [labelQuery, setLabelQuery] = useState('');
  const [ready, setReady] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<KnowledgeNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    void Promise.all([listCompanies(), getServiceHealth().catch(() => null)]).then(([items, serviceHealth]) => {
      setCompanies(items);
      setHealth(serviceHealth);
      const moderna = items.find((company) => company.ticker === 'MRNA');
      setCompanyId((current) => current || moderna?.id || items[0]?.id || ALL_COMPANIES);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    setSelectedId(null);
    setDetail(null);
  }, [companyId, ready]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const allCompanies = companyId === ALL_COMPANIES;
    const selected = companies.find((company) => company.id === companyId);
    const merck = companies.find((company) => company.ticker === 'MRK');
    const filteredView = Boolean(labelQuery)
      || activeTypes.size < entityTypes.length
      || activeRelationships.size < relationshipTypes.length;
    const modernaScene = selected?.ticker === 'MRNA' && !filteredView;
    void Promise.all([
      getKnowledgeGraph({
        companyId: allCompanies ? undefined : companyId || undefined,
        entityTypes: [...activeTypes],
        relationshipTypes: [...activeRelationships],
        query: labelQuery || undefined,
        limit: allCompanies ? 100_000 : 10_000,
      }),
      modernaScene && merck
        ? getKnowledgeGraph({ companyId: merck.id, entityTypes: ['company'], limit: 20 }).catch(() => ({ nodes: [], edges: [] }))
        : Promise.resolve({ nodes: [], edges: [] }),
    ]).then(([data, merckGraph]) => {
      if (cancelled) return;
      const merckNode = merckGraph.nodes.find((node) => node.entityType === 'company') ?? null;
      const graph = allCompanies
        ? layoutAllCompanies(data)
        : modernaScene
          ? layoutModernaScene(data, companyId, merckNode)
          : layoutNeighborhood(data, companyId);
      setNodes(graph.nodes);
      setEdges(graph.edges);
    }).catch((reason: Error) => {
      if (!cancelled) setError(reason.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
    // Graph reload is driven by hub/filter/label changes from the chat agent or UI chips.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setNodes/setEdges from React Flow are omitted on purpose
  }, [ready, companyId, activeTypes, activeRelationships, companies, labelQuery]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);
    void getGraphEntityDetail(selectedId).then((value) => {
      if (!cancelled) setDetail(value);
    }).catch(() => {
      if (!cancelled) setDetail(null);
    }).finally(() => {
      if (!cancelled) setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedId(null);
        setSqlResult(null);
        setSqlError('');
      }
    };
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, []);

  const toggleType = useCallback((type: string) => {
    setActiveTypes((current) => {
      if (current.has(type) && current.size === 1) return current;
      const next = new Set(current);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }, []);
  const toggleRelationship = useCallback((type: string) => {
    setActiveRelationships((current) => {
      if (current.has(type) && current.size === 1) return current;
      const next = new Set(current);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }, []);
  const expandSelected = useCallback(async () => {
    if (!selectedId || nodes.find((node) => node.id === selectedId)?.data.expanded) return;
    setExpanding(true);
    try {
      const data = await getKnowledgeGraph({
        nodeId: selectedId,
        entityTypes: [...activeTypes],
        relationshipTypes: [...activeRelationships],
        limit: 10_000,
      });
      const merged = mergeExpansion(nodes, edges, data, selectedId);
      setNodes(merged.nodes);
      setEdges(merged.edges);
    } finally {
      setExpanding(false);
    }
  }, [activeRelationships, activeTypes, edges, nodes, selectedId, setEdges, setNodes]);

  const applyGraphFilter = useCallback((filter: GraphAskFilter | undefined, companyList: Company[]) => {
    if (!filter) return;
    if (filter.allCompanies) {
      setCompanyId(ALL_COMPANIES);
    } else {
      const ticker = filter.companyTicker?.toUpperCase();
      const name = filter.companyName?.toLocaleLowerCase();
      const match = companyList.find((company) => (
        (ticker && company.ticker?.toUpperCase() === ticker)
        || (name && company.name.toLocaleLowerCase().includes(name))
      ));
      if (match) setCompanyId(match.id);
    }
    if (filter.entityTypes?.length) {
      const next = new Set(filter.entityTypes.filter((type) => entityTypes.includes(type) || type === 'product'));
      if (next.size) setActiveTypes(next);
    }
    if (filter.relationshipTypes?.length) {
      const next = new Set(filter.relationshipTypes.filter((type) => relationshipTypes.includes(type)));
      if (next.size) setActiveRelationships(next);
    }
    setLabelQuery(filter.labelQuery?.trim() ?? '');
  }, []);

  const runSql = useCallback(async (question: string) => {
    const prompt = question.trim();
    if (!prompt) return;
    setSqlBusy(true);
    setSqlError('');
    try {
      const result = await askGraphSql(prompt);
      setSqlResult(result);
      applyGraphFilter(result.graphFilter, companies);
    } catch (reason) {
      setSqlResult(null);
      setSqlError(reason instanceof Error ? reason.message : 'SQL agent failed');
    } finally {
      setSqlBusy(false);
    }
  }, [applyGraphFilter, companies]);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedId), [nodes, selectedId]);
  const typeCounts = useMemo(() => nodes.reduce<Record<string, number>>((counts, node) => {
    counts[node.data.entityType] = (counts[node.data.entityType] ?? 0) + 1;
    return counts;
  }, {}), [nodes]);
  const selectedCompany = companies.find((company) => company.id === companyId);
  const document = detail?.document ?? detail?.evidence[0] ?? null;

  return (
    <div className="graph-page">
      <div className={`graph-canvas-shell ${selectedId ? 'is-drawer-open' : ''}`}>
        <section className="knowledge-hub" aria-label="Company hub">
          <label>
            <span>Company hub</span>
            <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
              <option value={ALL_COMPANIES}>All companies</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name} · {company.ticker ?? '—'}</option>)}
            </select>
          </label>
          <div className="graph-health" title={`PostgreSQL: ${health?.postgres ?? 'checking'} · Neo4j: ${health?.neo4j ?? 'checking'}`}>
            <i className={health?.status === 'ok' ? 'is-connected' : ''} />
            <Database size={13} /> PostgreSQL
            <i className={health?.neo4j === 'connected' ? 'is-connected' : ''} />
            <Network size={13} /> Neo4j
          </div>
        </section>

        <section className="knowledge-filters" aria-label="Graph filters">
          <div className="knowledge-filter-row">
            {entityTypes.map((type) => (
              <button
                key={type}
                className={activeTypes.has(type) ? 'is-active' : ''}
                onClick={() => toggleType(type)}
                style={{ '--filter-color': ENTITY_STYLES[type].color } as React.CSSProperties}
              >
                <i />{ENTITY_STYLES[type].label}<b>{typeCounts[type] ?? 0}</b>
              </button>
            ))}
          </div>
          <details className="relationship-filter">
            <summary>Relationships · {edges.length}</summary>
            <div>
              {relationshipTypes.map((type) => (
                <button key={type} className={activeRelationships.has(type) ? 'is-active' : ''} onClick={() => toggleRelationship(type)}>
                  <i style={{ background: RELATION_STYLES[type].color }} />{type.replaceAll('_', ' ')}
                </button>
              ))}
            </div>
          </details>
        </section>
        <ReactFlow
          key={companyId || 'all'}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ type: 'default', animated: false }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.12, minZoom: 0.08, maxZoom: 1.1 }}
          minZoom={0.04}
          maxZoom={2.2}
          panOnDrag
          panOnScroll
          zoomOnPinch
          zoomOnScroll
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#d8dfdb" />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={(node) => (node.data as KnowledgeNode['data'])?.color ?? '#81958D'}
            maskColor="rgb(248 249 247 / 72%)"
          />
        </ReactFlow>

        {loading && <div className="graph-state"><Loader2 className="graph-spin" size={20} />Loading {companyId === ALL_COMPANIES ? 'all companies' : selectedCompany?.name ?? 'knowledge graph'}…</div>}
        {!loading && error && <div className="graph-state is-error"><strong>Graph unavailable</strong><span>{error}</span></div>}
        {!loading && !error && nodes.length === 0 && <div className="graph-state"><strong>No connected evidence</strong><span>Try another company or filter.</span></div>}

        <aside className={`graph-company-drawer ${selectedId ? 'is-open' : ''}`} aria-hidden={!selectedId}>
          {selectedId && (
            <>
              <div className="graph-drawer-head">
                <span>{selectedNode?.data.entityType.replaceAll('_', ' ') ?? 'Entity'} intelligence</span>
                <button aria-label="Close details" onClick={() => setSelectedId(null)}><X size={16} /></button>
              </div>
              <div className="graph-drawer-body">
                <div className="graph-entity-mark" style={{ background: `${selectedNode?.data.color}18`, color: selectedNode?.data.color }}><Tag size={18} /></div>
                <h2>{detail?.entity.label ?? selectedNode?.data.label ?? 'Loading…'}</h2>
                <p className="graph-company-subtitle">{detail?.company?.ticker ? `${detail.entity.entityType.replaceAll('_', ' ')} · ${detail.company.ticker}` : detail?.entity.entityType.replaceAll('_', ' ')}</p>
                {detailLoading && <div className="drawer-loading"><Loader2 className="graph-spin" size={16} />Loading details…</div>}
                {!detailLoading && detail && (
                  <>
                    <div className="graph-drawer-rule" />
                    <div className="graph-drawer-field"><Tag size={14} /><div><small>Identifier</small><strong>{detail.entity.externalId ?? document?.providerId ?? detail.entity.id}</strong></div></div>
                    {document?.publishedAt && <div className="graph-drawer-field"><CalendarDays size={14} /><div><small>Published</small><strong>{new Date(document.publishedAt).toLocaleDateString()}</strong><span>{document.provider}</span></div></div>}
                    {document?.excerpt && <div className="graph-evidence-copy"><small>Main information</small><p>{document.excerpt}</p></div>}
                    {document?.url && <a className="graph-company-url" href={document.url} target="_blank" rel="noreferrer">Open source evidence <ExternalLink size={12} /></a>}
                    <div className="graph-drawer-field"><Network size={14} /><div><small>Relations</small><strong>{detail.relationships.length} connected relationship{detail.relationships.length === 1 ? '' : 's'}</strong></div></div>
                    <button className="graph-drawer-action" onClick={() => void expandSelected()} disabled={expanding || selectedNode?.data.expanded}>
                      {expanding ? 'Expanding…' : selectedNode?.data.expanded ? 'Neighbors expanded' : 'Expand neighbors'} <ArrowUpRight size={14} />
                    </button>
                    {detail.company && <a className="graph-profile-link" href={`/companies/${detail.company.id}`}>Open company profile <ArrowUpRight size={14} /></a>}
                  </>
                )}
              </div>
            </>
          )}
        </aside>
        <div className="graph-promptbar">
          {(sqlResult || sqlError) && (
            <div className={`graph-sql-panel ${sqlError ? 'is-error' : ''}`}>
              <div className="graph-sql-head">
                <strong>{sqlError ? 'Query failed' : sqlResult?.explanation || 'SQL result'}</strong>
                <button aria-label="Close SQL result" onClick={() => { setSqlResult(null); setSqlError(''); }}><X size={14} /></button>
              </div>
              {sqlResult?.graphFilter && (
                <p className="graph-sql-filter">
                  Graph filter · {sqlResult.graphFilter.allCompanies ? 'all companies' : sqlResult.graphFilter.companyName || sqlResult.graphFilter.companyTicker || selectedCompany?.name || 'current hub'}
                  {sqlResult.graphFilter.entityTypes?.length ? ` · ${sqlResult.graphFilter.entityTypes.join(', ')}` : ''}
                  {sqlResult.graphFilter.labelQuery ? ` · “${sqlResult.graphFilter.labelQuery}”` : ''}
                </p>
              )}
              {sqlResult?.sql && <pre>{sqlResult.sql}</pre>}
              {sqlError && <p>{sqlError}</p>}
              {sqlResult && sqlResult.rows.length > 0 && (
                <div className="graph-sql-table">
                  <table>
                    <thead>
                      <tr>{Object.keys(sqlResult.rows[0]).map((column) => <th key={column}>{column}</th>)}</tr>
                    </thead>
                    <tbody>
                      {sqlResult.rows.slice(0, 25).map((row, index) => (
                        <tr key={index}>{Object.keys(sqlResult.rows[0]).map((column) => <td key={column}>{formatSqlCell(row[column])}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                  <small>{sqlResult.rowCount} row{sqlResult.rowCount === 1 ? '' : 's'}</small>
                </div>
              )}
              {sqlResult && sqlResult.rows.length === 0 && <p>No rows returned.</p>}
            </div>
          )}
          <PromptBar
            placeholder="Show Moderna clinical trials and related news…"
            busy={sqlBusy}
            hint="Graph + SQL agent"
            onSend={(question) => void runSql(question)}
          />
        </div>
      </div>
    </div>
  );
}
