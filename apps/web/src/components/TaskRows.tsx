import { useEffect, useState, type ReactNode } from 'react';

const TASKS = [
  { key: 'snapshot', label: 'Retrieve healthcare sources', amount: '24 documents', status: 'done', step: 1, details: [{ label: 'ClinicalTrials.gov and PubMed', meta: '24 found' }, { label: 'Source records normalized', meta: '24/24' }] },
  { key: 'health', label: 'Evaluate healthcare developments', amount: '18 entities', status: 'running', step: 2, details: [{ label: 'Reading trials and publications', meta: '18 files' }, { label: 'Scoring signal relevance', meta: '68%' }] },
  { key: 'finance', label: 'Evaluate financial impact', amount: '9 signals', status: 'sequence', step: 3, details: [{ label: 'Reviewing market and company signals', meta: '9 links' }, { label: 'Scoring downstream relevance', meta: 'draft' }] },
  { key: 'output', label: 'Prepare intelligence output', amount: '1 report', status: 'sequence', step: 4, details: [{ label: 'Linking evidence to Moderna', meta: 'draft' }, { label: 'Preparing watch-list recommendation', meta: 'draft' }] },
] as const;

function Spinner({ active, children }: { active?: boolean; children?: ReactNode }) { return <span className="task-spinner">{active && <span className="task-spinner-sweep" />}{children}</span>; }
function Badge({ tone, children }: { tone: 'red' | 'green'; children: ReactNode }) { return <span className={`task-badge task-badge-${tone}`}>{children}</span>; }
const Check = <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>;
const Cross = <svg viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12" /></svg>;
const Retry = <svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>;

export function TaskRowsDemo({ onViewResults }: { onViewResults?: () => void }) {
  const [tick, setTick] = useState(0); const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => { if (tick >= 5) return; const timer = setTimeout(() => setTick((value) => value + 1), [600, 900, 2400, 1400, 2400][tick]); return () => clearTimeout(timer); }, [tick]);
  const retryState = tick < 3 ? 'pending' : tick === 3 ? 'failed' : 'done';
  const reset = () => { setTick(0); setOpen({}); };
  return <div className="task-rows"><div className="task-rows-header"><span>Agent process</span><button type="button" onClick={reset}>↻ Replay</button></div>{TASKS.map((task, index) => { const expanded = open[task.key] ?? (task.key === 'health' && tick === 2); const state = task.status === 'done' ? 'done' : task.status === 'running' ? 'running' : retryState; return <div key={task.key} className={`task-row ${expanded ? 'is-expanded' : ''}`}><button type="button" className="task-row-trigger" aria-expanded={expanded} onClick={() => setOpen((current) => ({ ...current, [task.key]: !expanded }))}><span className="task-status">{task.status === 'done' ? <Badge tone="green">{Check}</Badge> : task.status === 'running' ? <Spinner active>{task.step}</Spinner> : state === 'pending' ? <Spinner>{task.step}</Spinner> : state === 'failed' ? <Badge tone="red">{Cross}</Badge> : <Badge tone="green">{Check}</Badge>}</span><span className={`task-label ${state === 'pending' ? 'is-pending' : ''}`}>{task.label}</span><span className="task-amount">{task.amount}</span>{task.status !== 'running' && state === 'failed' && <span className="task-state task-failed">Failed {Retry}</span>}{task.status !== 'running' && state === 'done' && <span className="task-state task-completed">Completed</span>}<span className={`task-chevron ${expanded ? 'is-open' : ''}`}>⌄</span></button><div className={`task-details ${expanded ? 'is-open' : ''}`}><div>{task.details.map((detail) => <div className="task-detail" key={detail.label}><span>{detail.label}</span><code>{detail.meta}</code></div>)}</div></div></div>; })}<div className="task-rows-foot">{tick >= 5 ? 'All agent steps finished.' : 'The agent updates each step as it moves through the plan.'}</div>{tick >= 5 && <button type="button" className="task-view-results" onClick={onViewResults}>View results <span>→</span></button>}</div>;
}
