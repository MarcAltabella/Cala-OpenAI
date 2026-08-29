import { useEffect, useState } from 'react';

type ContextChunk = { title: string; chars: string; body: string; source: string; badge: string; tone: string };

const CHUNKS: ContextChunk[] = [
  { title: 'Clinical trial update', chars: '1,248 characters', body: 'Phase 3 melanoma vaccine trial records show a new development milestone and an updated evidence trail for Moderna.', source: 'ClinicalTrials.gov record', badge: 'WEB', tone: 'context-web' },
  { title: 'Publication evidence', chars: '982 characters', body: 'Recent mRNA-4157 research supports continued monitoring of the oncology pipeline and related clinical activity.', source: 'PubMed publication', badge: 'PDF', tone: 'context-pdf' },
];

export function ContextCards() {
  const [chipsShown, setChipsShown] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setChipsShown(true), 700); return () => clearTimeout(timer); }, []);
  return <div className="context-cards"><div className="context-cards-header"><span>References</span><b>2</b></div>{CHUNKS.map((chunk, index) => <div className="context-card" key={chunk.title} style={{ animationDelay: `${index * 100}ms` }}><div className="context-card-bar"><span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>{chunk.title}</span><small>{chunk.chars}</small></div><p>{chunk.body}</p><div className="context-card-source" style={{ opacity: chipsShown ? 1 : 0, transform: chipsShown ? 'scale(1)' : 'scale(.95)', transitionDelay: `${index * 80}ms` }}><i className={chunk.tone}>{chunk.badge}</i>{chunk.source}<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10" /></svg></div></div>)}</div>;
}
