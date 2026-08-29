import { memo, useEffect, useMemo, useState } from 'react';
import { Background, BackgroundVariant, Handle, Position, ReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { createAgentRun, getRun, getRunEvents, type Run, type RunEvent } from '../lib/api';
import './AgentFlow.css';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
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

function statusesFor(run: Run | null): StepStatus[] {
  if (!run) return PROCESS.map(() => 'pending');
  if (run.status === 'completed') return PROCESS.map(() => 'completed');
  if (run.status === 'failed') return PROCESS.map((_, index) => index < 2 ? 'completed' : 'failed');
  const phaseIndex = { queued: 0, fanout: 0, relations: 1, healthcare_gate: 2, stopped: 3, finance: 3, completed: 4, failed: 4 }[run.phase];
  return PROCESS.map((_, index) => index < phaseIndex ? 'completed' : index === phaseIndex ? 'running' : 'pending');
}

export function AgentFlow({ companyId, initialRun, onViewResults }: { companyId: string; initialRun?: Run; onViewResults?: () => void }) {
  const [run, setRun] = useState<Run | null>(initialRun ?? null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statuses = statusesFor(run);
  const running = starting || run?.status === 'queued' || run?.status === 'running';
  const complete = run?.status === 'completed';
  const nodes = useMemo<AgentNode[]>(() => PROCESS.map((item, index) => ({ id: item.id, type: 'agent', position: { x: index * 265, y: 55 }, data: { ...item, status: statuses[index] } })), [statuses]);

  useEffect(() => { if (!starting && initialRun) setRun(initialRun); }, [initialRun, starting]);

  const runAgent = async () => {
    setStarting(true); setError(null);
    try {
      const queued = await createAgentRun(companyId);
      const poll = async (): Promise<void> => {
        const [nextRun, nextEvents] = await Promise.all([getRun(queued.id), getRunEvents(queued.id)]);
        setRun(nextRun); setEvents(nextEvents);
        if (nextRun.status === 'queued' || nextRun.status === 'running') { await new Promise((resolve) => setTimeout(resolve, 1200)); return poll(); }
      };
      await poll();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to run agent'); }
    finally { setStarting(false); }
  };

  return <div className="agent-flow">
    <div className="agent-flow-heading"><span>Agent process</span><button type="button" className="agent-flow-run" onClick={() => void runAgent()} disabled={running}>{running ? 'Running…' : complete ? 'Run again' : 'Run agent'}</button></div>
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} defaultViewport={{ x: 30, y: 0, zoom: 1 }} nodesDraggable={false} nodesConnectable={false} panOnDrag={false} panOnScroll={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} preventScrolling proOptions={{ hideAttribution: true }}><Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e1e7e2" /></ReactFlow>
    <div className="agent-flow-tools">{PROCESS.map((process, index) => <div className={`agent-flow-tool-group is-${statuses[index]}`} key={process.id}>{statuses[index] === 'pending' ? <span className="agent-flow-tools-empty">Tools appear while this step runs</span> : process.tools.map((tool) => <span className="agent-flow-tool" key={tool}><i />{tool}<b>{statuses[index] === 'running' ? 'running' : statuses[index] === 'failed' ? 'failed' : 'done'}</b></span>)}</div>)}</div>
    {events.length > 0 && <div className="agent-flow-events">{events.slice(-4).map((event) => <div key={event.id}><span>{event.tool ?? event.phase}</span><small>{event.summary ?? event.kind}</small></div>)}</div>}
    {error && <p className="agent-flow-error" role="alert">{error}</p>}
    {complete && <button type="button" className="agent-flow-results" onClick={onViewResults}>View results <span>→</span></button>}
  </div>;
}
