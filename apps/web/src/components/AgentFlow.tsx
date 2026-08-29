import { memo, useEffect, useMemo, useState } from 'react';
import { Background, BackgroundVariant, Handle, Position, ReactFlow, type Node, type NodeProps } from '@xyflow/react';
import './AgentFlow.css';

type StepStatus = 'pending' | 'running' | 'completed';
type AgentNodeData = { id: string; title: string; summary: string; amount: string; status: StepStatus };
type AgentNode = Node<AgentNodeData, 'agent'>;

const PROCESS = [
  { id: 'sources', title: 'Agent scraping website', summary: 'Public research sources fan out', amount: '4 tools', tools: ['PubMed', 'ClinicalTrials.gov', 'IR / RSS news', 'Web news'] },
  { id: 'cala', title: 'Cala response', summary: 'Healthcare intelligence retrieved', amount: '3 tools', tools: ['Cala healthcare query', 'Entity extraction', 'Source snapshot'] },
  { id: 'health', title: 'Healthcare updates', summary: 'Relations and relevance evaluated', amount: '3 tools', tools: ['Build relation pack', 'Healthcare gate', 'New signal check'] },
  { id: 'finance', title: 'Financial output', summary: 'Impact assessment and report', amount: '3 tools', tools: ['Cala finance query', 'Financial impact', 'Watch-list recommendation'] },
] as const;

function CalaMark() {
  return <svg className="agent-flow-cala-mark" viewBox="0 0 48 48" aria-label="Cala" role="img"><path d="M40 10C31 4 17 7 12 17c-4 8-1 17 6 21 7 4 17 2 22-4-8 3-16-1-17-8-1-7 6-13 17-16Z" fill="currentColor" /></svg>;
}

const AgentNodeCard = memo(({ data }: NodeProps<AgentNode>) => (
  <div className={`agent-flow-node is-${data.status}`}>
    <Handle type="target" position={Position.Left} className="agent-flow-handle" />
    <div className="agent-flow-trigger">
      <span className={`agent-flow-status is-${data.status} ${data.id === 'cala' ? 'is-cala' : ''}`}>{data.id === 'cala' ? <CalaMark /> : data.status === 'completed' ? '✓' : data.status === 'running' ? '•' : '·'}</span>
      <span className="agent-flow-copy"><strong>{data.title}</strong><small>{data.summary}</small></span>
      <span className="agent-flow-amount">{data.status === 'completed' ? 'done' : data.amount}</span>
    </div>
    <Handle type="source" position={Position.Right} className="agent-flow-handle" />
  </div>
));

const nodeTypes = { agent: AgentNodeCard };
const edges = PROCESS.slice(0, -1).map((item, index) => ({ id: `edge-${item.id}`, source: item.id, target: PROCESS[index + 1].id, type: 'smoothstep', animated: true, style: { stroke: '#9fb2a4', strokeWidth: 1.5 } }));

export function AgentFlow({ onViewResults }: { companyId: string; onViewResults?: () => void }) {
  const [step, setStep] = useState(-1);
  const running = step >= 0 && step < PROCESS.length;
  const complete = step === PROCESS.length;
  const statuses = PROCESS.map((_, index): StepStatus => index < step ? 'completed' : index === step ? 'running' : 'pending');
  const nodes = useMemo<AgentNode[]>(() => PROCESS.map((item, index) => ({ id: item.id, type: 'agent', position: { x: index * 265, y: 55 }, data: { ...item, status: statuses[index] } })), [statuses]);

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setStep((current) => current + 1), 1250);
    return () => clearTimeout(timer);
  }, [running, step]);

  return <div className="agent-flow">
    <div className="agent-flow-heading"><span>Agent process</span><button type="button" className="agent-flow-run" onClick={() => setStep(0)} disabled={running}>{running ? 'Running…' : complete ? 'Run again' : 'Run agent'}</button></div>
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} defaultViewport={{ x: 30, y: 0, zoom: 1 }} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} panOnScroll={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} preventScrolling proOptions={{ hideAttribution: true }}><Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e1e7e2" /></ReactFlow>
    <div className="agent-flow-tools">{PROCESS.map((process, index) => <div className={`agent-flow-tool-group is-${statuses[index]}`} key={process.id}>{statuses[index] === 'pending' ? <span className="agent-flow-tools-empty">Tools appear while this step runs</span> : process.tools.map((tool) => <span className="agent-flow-tool" key={tool}><i />{tool}<b>{statuses[index] === 'running' ? 'running' : 'done'}</b></span>)}</div>)}</div>
    {complete && <button type="button" className="agent-flow-results" onClick={onViewResults}>View results <span>→</span></button>}
  </div>;
}
