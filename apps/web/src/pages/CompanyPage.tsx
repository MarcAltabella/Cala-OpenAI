import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCompanyOutput, listCompanies, type Company, type CompanyOutput } from '../lib/api';
import { AgentFlow } from '../components/AgentFlow';
import ContextCards from '../components/ContextCards';

export function CompanyPage({ companyId, onBack }: { companyId: string; onBack: () => void }) {
  const [company, setCompany] = useState<Company>();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('runs');
  const [output, setOutput] = useState<CompanyOutput | null>(null);

  useEffect(() => {
    setError(null);
    listCompanies()
      .then((all) => {
        const match = all.find((item) => item.id === companyId);
        if (!match) throw new Error(`Company ${companyId} not found in Postgres`);
        setCompany(match);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load company'));
  }, [companyId]);

  useEffect(() => {
    if (tab !== 'outputs' || !company) return;
    getCompanyOutput(company.id).then(setOutput).catch(() => setOutput(null));
  }, [tab, company]);

  if (error) return <p>Could not load from Postgres: {error}</p>;
  if (!company) return <p>Loading company…</p>;

  return <>
    <div className="company-back"><Button variant="outline" size="sm" className="company-back-button" onClick={onBack}><ArrowLeft data-icon="inline-start" /> Companies</Button></div>
    <header className="page-header company-page-header"><div><h1>{company.name}</h1><p>{company.ticker} · company intelligence workspace</p></div></header>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList><TabsTrigger value="runs">Agent runs</TabsTrigger><TabsTrigger value="outputs">Outputs</TabsTrigger></TabsList>
      <TabsContent value="runs" className="runs-flow-panel" keepMounted>
        <AgentFlow companyId={company.id} onViewResults={() => setTab('outputs')} />
      </TabsContent>
      <TabsContent value="outputs" className="output-document">
        {!output ? <p>No completed report is available yet. Run the agents to generate one.</p> : <>
          <h2>{company.name} development report</h2>
          <p>Run {output.run.id} · {output.run.phase}</p>
          {output.healthcareGate && <section><h3>Healthcare evaluation</h3><p>{output.healthcareGate.developmentSummary}</p><p>{output.healthcareGate.rationale}</p><p>Relevance score: {Number(output.healthcareGate.relevanceScore).toFixed(2)} · {output.healthcareGate.isNew ? 'New' : 'Existing'} · {output.healthcareGate.isRelevant ? 'Relevant' : 'Not relevant'}</p></section>}
          {output.financeImpact && <section><h3>Financial evaluation</h3><p>{output.financeImpact.developmentSummary}</p><p>{output.financeImpact.rationale}</p><p>{output.financeImpact.potentialProductOrCatalyst} · {output.financeImpact.expectedImpact.direction} impact · {output.financeImpact.expectedImpact.magnitude} magnitude · {output.financeImpact.expectedImpact.horizon}</p></section>}
          {output.snapshots.length > 0 && <section><h3>Cala snapshots</h3>{output.snapshots.map((snapshot) => <p key={snapshot.id}><strong>{snapshot.kind}</strong>: {snapshot.input} · {snapshot.results.length} results · {snapshot.entities.length} entities</p>)}</section>}
          <section>{output.references.length === 0 ? <><h3>References</h3><p>No source references were stored for this run.</p></> : <ContextCards labels={{ header: 'References', count: '' }} chunks={output.references.map((reference) => ({ title: (reference.excerpt.split('..')[0] || reference.providerId).slice(0, 96), chars: `${reference.excerpt.length.toLocaleString()} characters`, body: reference.excerpt, source: `${reference.provider} · ${reference.providerId}`, sourceUrl: reference.url, badge: 'WWW', tone: 'bg-green' }))} />}</section>
        </>}
      </TabsContent>
    </Tabs>
  </>;
}
