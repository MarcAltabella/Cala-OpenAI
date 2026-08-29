import { memo, useEffect, useMemo, useState } from 'react';
import { Background, BackgroundVariant, Handle, Position, ReactFlow, type Node, type NodeProps } from '@xyflow/react';
import './AgentFlow.css';

type AgentNodeData = { title: string; amount: string; summary: string; details: string[]; expanded?: boolean; onToggle?: () => void };
type AgentNode = Node<AgentNodeData, 'agent'>;

const PROCESS = [
  { id: 'scrape', title: 'Agent scraping website', amount: '12 sources', summary: 'Company website and public records', details: ['Scanning company website', 'Collecting filings and publications'] },
  { id: 'response', title: 'Cala response', amount: '24 records', summary: 'Sources normalized and linked', details: ['Cleaning source metadata', 'Creating company evidence links'] },
  { id: 'health', title: 'Healthcare updates', amount: '18 signals', summary: 'Clinical and research evaluation', details: ['Reviewing trial developments', 'Scoring healthcare relevance'] },
  { id: 'output', title: 'Financial impact and output', amount: '1 report', summary: 'Recommendation ready to review', details: ['Evaluating downstream impact', 'Preparing watch-list recommendation'] },
];

const AgentNodeCard = memo(({ data }: NodeProps<AgentNode>) => <div className={`agent-flow-node ${data.expanded ? 'is-expanded' : ''}`}><Handle type="target" position={Position.Left} className="agent-flow-handle" /><button type="button" className="agent-flow-trigger" onClick={data.onToggle} aria-expanded={data.expanded}><span className="agent-flow-status">{data.expanded ? '−' : '+'}</span><span className="agent-flow-copy"><strong>{data.title}</strong><small>{data.summary}</small></span><span className="agent-flow-amount">{data.amount}</span><span className="agent-flow-chevron">⌄</span></button><div className="agent-flow-details">{data.details.map((detail) => <div key={detail}><span>{detail}</span><code>ready</code></div>)}</div><Handle type="source" position={Position.Right} className="agent-flow-handle" /></div>);

const nodeTypes = { agent: AgentNodeCard };
const edges = PROCESS.slice(0, -1).map((item, index) => ({ id: `agent-edge-${item.id}`, source: item.id, target: PROCESS[index + 1].id, type: 'smoothstep', animated: true, style: { stroke: '#9fb2a4', strokeWidth: 1.5 } }));

export function AgentFlow({ onViewResults }: { onViewResults?: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setComplete(true), 5400); return () => clearTimeout(timer); }, []);
  const nodes = useMemo<AgentNode[]>(() => PROCESS.map((item, index) => ({ id: item.id, type: 'agent', position: { x: index * 265, y: 110 }, data: { ...item, expanded: openId === item.id, onToggle: () => setOpenId((current) => current === item.id ? null : item.id) } })), [openId]);
  return <div className="agent-flow"><div className="agent-flow-label">Agent process</div><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: .18 }} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} panOnScroll={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} proOptions={{ hideAttribution: true }}><Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e1e7e2" /></ReactFlow>{complete && <button type="button" className="agent-flow-results" onClick={onViewResults}>View results <span>→</span></button>}</div>;
}
