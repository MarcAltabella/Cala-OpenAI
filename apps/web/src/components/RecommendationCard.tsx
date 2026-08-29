import { useState, type ReactNode } from 'react';

type RecommendationOption = { key: string; body: ReactNode; short: string; signal: number; tone: string; label: string; cta: string };

const options: RecommendationOption[] = [
  { key: 'high', body: <>Add <span className="recommendation-entity">Moderna</span> to the watch list with <span className="recommendation-value">clinical-trial monitoring</span>.</>, short: 'Add Moderna with trial monitoring', signal: 3, tone: '#39a965', label: 'High confidence', cta: 'Add to watch list' },
  { key: 'review', body: <>Track Moderna under <span className="recommendation-value">oncology</span> only for a narrower signal.</>, short: 'Track oncology signals only', signal: 2, tone: '#d09a52', label: 'Needs review', cta: 'Configure' },
  { key: 'none', body: <>Keep Moderna out of the watch list until another relevant development appears.</>, short: 'Wait for another development', signal: 0, tone: '#98a19a', label: 'No signal', cta: 'Keep unlisted' },
];

function Meter({ signal, tone }: { signal: number; tone: string }) { return <span className="recommendation-meter">{[0, 1, 2].map((bar) => <i key={bar} style={{ height: 10 + bar * 3, background: bar < signal ? tone : '#dfe4df' }} />)}</span>; }

export function RecommendationCard() {
  const [selected, setSelected] = useState(0); const [open, setOpen] = useState(false); const [accepted, setAccepted] = useState(false); const active = options[selected]; const others = options.map((option, index) => ({ option, index })).filter(({ index }) => index !== selected);
  return <div className="recommendation-card recommendation-exact"><div className="recommendation-card-body"><span className="recommendation-title">Want me to add this company to your watch list?</span><p key={active.key} className="recommendation-copy">{active.body}</p></div><div className={`recommendation-alternatives ${open ? 'is-open' : ''}`}><div><span>Other options</span>{others.map(({ option, index }) => <button key={option.key} type="button" onClick={() => { setSelected(index); setAccepted(false); }}><Meter signal={option.signal} tone={option.tone} /><span>{option.short}</span><small>{option.label}</small></button>)}</div></div><div className="recommendation-card-footer"><span className="recommendation-confidence"><Meter signal={active.signal} tone={active.tone} />{active.label}</span><span className="recommendation-actions"><button type="button" className="recommendation-secondary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Alternatives</button><button type="button" className="recommendation-primary" onClick={() => setAccepted(true)}>{accepted ? 'Accepted' : active.cta}</button></span></div></div>;
}
