import { memo, useMemo, useState } from 'react';
import { Background, BackgroundVariant, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { ArrowUpRight, Building2, CalendarDays, ExternalLink, Tag, X } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import { graphData } from '../lib/api';
import { PromptBar } from '../components/PromptBar';

type HealthcareNodeData = { label: string; type: string };
type HealthcareNode = Node<HealthcareNodeData, 'healthcare'>;

const HealthcareNode = memo(({ data }: NodeProps<HealthcareNode>) => (
  <div className={`graph-node ${data.type.replace(' ', '-')}`}>
    <Handle type="target" position={Position.Top} className="graph-handle" />
    <div className="graph-node-inner">
      <div className="node-title"><span className="node-dot" />{data.label}</div>
      <small>{data.type}</small>
    </div>
    <Handle type="source" position={Position.Bottom} className="graph-handle" />
  </div>
));

const nodeTypes = { healthcare: HealthcareNode };

function radialLayout(nodes: ReturnType<typeof graphData>['nodes']): HealthcareNode[] {
  const center = nodes.find((node) => node.id === 'moderna');
  const ring = nodes.filter((node) => node.id !== 'moderna');
  return nodes.map((node) => {
    const index = ring.findIndex((item) => item.id === node.id);
    const angle = index * ((Math.PI * 2) / Math.max(ring.length, 1)) - Math.PI / 2;
    return { id: node.id, type: 'healthcare', position: node.id === center?.id ? { x: 400, y: 250 } : { x: 400 + Math.cos(angle) * 230, y: 250 + Math.sin(angle) * 150 }, data: { label: node.label, type: node.type } };
  });
}

export function KnowledgeGraphPage() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const data = useMemo(() => graphData(query), [query]);
  const nodes = useMemo(() => radialLayout(data.nodes), [data.nodes]);
  const selected = data.nodes.find((node) => node.id === selectedId);
  const relationshipByTarget: Record<string, string> = { melanoma: 'develops', paper: 'supported by', trial: 'running', patent: 'protected by' };
  const edges: Edge[] = data.edges.map((edge) => ({ ...edge, type: 'bezier', label: relationshipByTarget[edge.target] ?? 'related to', labelStyle: { fill: '#7f8982', fontSize: 10, fontWeight: 500 }, labelBgStyle: { fill: '#f8f9f7', fillOpacity: .94 }, labelBgPadding: [4, 3], style: { stroke: edge.target === 'trial' ? '#6c82d8' : edge.target === 'patent' ? '#d09a52' : '#55ae83', strokeWidth: 2, strokeDasharray: edge.target === 'trial' || edge.target === 'patent' ? '5 5' : undefined } }));
  return <div className="graph-page"><div className={`graph-canvas-shell ${selected ? 'is-drawer-open' : ''}`}><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: .52, minZoom: .35, maxZoom: .78 }} minZoom={.28} maxZoom={1.1} nodesDraggable={false} panOnDrag panOnScroll zoomOnScroll onNodeClick={(_, node) => setSelectedId(node.id)} onPaneClick={() => setSelectedId(null)} proOptions={{ hideAttribution: true }}><Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#d8dfdb" /></ReactFlow><aside className={`graph-company-drawer ${selected ? 'is-open' : ''}`} aria-hidden={!selected}>{selected && <><div className="graph-drawer-head"><span>Company intelligence</span><button aria-label="Close company details" onClick={() => setSelectedId(null)}><X size={16} /></button></div><div className="graph-drawer-body"><div className="graph-company-mark"><Building2 size={18} /></div><h2>Moderna</h2><p className="graph-company-subtitle">{selected.id === 'moderna' ? 'Biotechnology company' : `Connected through ${selected.type}`}</p><a className="graph-company-url" href="https://www.modernatx.com" target="_blank" rel="noreferrer">modernatx.com <ExternalLink size={12} /></a><div className="graph-drawer-rule" /><div className="graph-drawer-field"><Tag size={14} /><div><small>Categories</small><strong>Oncology · mRNA therapeutics · Vaccines</strong></div></div><div className="graph-drawer-field"><CalendarDays size={14} /><div><small>Last development</small><strong>Phase 3 melanoma vaccine trial</strong><span>12 May 2025 · Recent</span></div></div><div className="graph-drawer-field"><ArrowUpRight size={14} /><div><small>Selected signal</small><strong>{selected.label}</strong><span>{selected.type}</span></div></div><button className="graph-drawer-action">Open company profile <ArrowUpRight size={14} /></button></div></>}</aside><div className="graph-promptbar"><PromptBar placeholder="Search the knowledge graph…" onSend={setQuery} /></div></div></div>;
}
