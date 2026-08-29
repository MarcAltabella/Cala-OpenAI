import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ExternalLink, Plus, Search } from 'lucide-react';
import { listCompanies, type Company } from '../lib/api';

type Strength = 'strong' | 'medium' | 'weak';
type RecordCompany = Company & { categories: string[]; development: string; recency: string; strength: Strength; url: string };

const DETAILS: Record<string, Omit<RecordCompany, keyof Company>> = {
  moderna: { categories: ['Oncology', 'mRNA', 'Vaccines'], development: 'Phase 3 melanoma vaccine trial updated', recency: 'Recent', strength: 'strong', url: 'https://www.modernatx.com' },
  pfizer: { categories: ['Vaccines', 'Oncology'], development: 'Clinical pipeline update published', recency: 'Recent', strength: 'medium', url: 'https://www.pfizer.com' },
  'eli-lilly': { categories: ['Metabolic', 'Neuroscience'], development: 'Late-stage pipeline results reported', recency: 'Recent', strength: 'strong', url: 'https://www.lilly.com' },
  jnj: { categories: ['MedTech', 'Immunology'], development: 'Regulatory filing added to record', recency: 'Late', strength: 'medium', url: 'https://www.jnj.com' },
  roche: { categories: ['Diagnostics', 'Oncology'], development: 'New oncology study indexed', recency: 'Recent', strength: 'strong', url: 'https://www.roche.com' },
  abbvie: { categories: ['Immunology', 'Oncology'], development: 'Investor pipeline commentary retrieved', recency: 'Late', strength: 'medium', url: 'https://www.abbvie.com' },
  merck: { categories: ['Vaccines', 'Oncology'], development: 'Trial registry record refreshed', recency: 'Recent', strength: 'strong', url: 'https://www.merck.com' },
  novartis: { categories: ['Oncology', 'Gene therapy'], development: 'Research publication added', recency: 'Late', strength: 'medium', url: 'https://www.novartis.com' },
  amgen: { categories: ['Cardiology', 'Metabolic'], development: 'No new relevant development found', recency: 'Late', strength: 'weak', url: 'https://www.amgen.com' },
  sanofi: { categories: ['Vaccines', 'Immunology'], development: 'Regulatory update retrieved', recency: 'Recent', strength: 'medium', url: 'https://www.sanofi.com' },
};

const fallback = (company: Company): RecordCompany => ({ ...company, categories: ['Healthcare'], development: 'No new relevant development found', recency: 'Late', strength: 'weak', url: '#' });

function Tag({ label, index }: { label: string; index: number }) { return <span className={`company-tag tag-${index % 5}`}>{label}</span>; }

export function CompaniesPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'name' | 'recency'>('name');
  useEffect(() => { listCompanies().then(setCompanies); }, []);
  const rows = useMemo(() => companies.map((company) => ({ ...fallback(company), ...DETAILS[company.id] })).filter((company) => `${company.name} ${company.ticker} ${company.categories.join(' ')} ${company.development}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : a.recency.localeCompare(b.recency)), [companies, query, sort]);
  return <div className="records-page"><header className="page-header records-page-header"><div><h1>Companies</h1><p>Healthcare companies and the latest signals worth tracking.</p></div><button className="records-add-button"><Plus size={16} /> Add company</button></header><div className="records-toolbar"><label className="records-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies, categories, developments…" /></label><button className="records-sort" onClick={() => setSort((value) => value === 'name' ? 'recency' : 'name')}><ArrowUpDown size={15} /> Sort: {sort === 'name' ? 'Company' : 'Recency'}</button></div><div className="records-table-shell"><table className="records-table"><thead><tr><th>Company</th><th>Categories</th><th>Last development</th><th>Recency</th><th>Signal strength</th><th>URL</th></tr></thead><tbody>{rows.map((company) => <tr key={company.id} onClick={() => onOpen(company.id)}><td><span className="company-initial">{company.name.slice(0, 1)}</span><span className="records-company-name">{company.name}</span><small>{company.ticker}</small></td><td><div className="company-tags">{company.categories.map((category, index) => <Tag key={category} label={category} index={index} />)}</div></td><td>{company.development}</td><td><span className={`recency recency-${company.recency.toLowerCase()}`}>{company.recency}</span></td><td><span className={`strength strength-${company.strength}`}><i />{company.strength === 'strong' ? 'Very strong' : company.strength === 'medium' ? 'Needs review' : 'Weak'}</span></td><td>{company.url !== '#' ? <a href={company.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><span>{company.url.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span><ExternalLink size={13} /></a> : '—'}</td></tr>)}</tbody><tfoot><tr><td colSpan={6}>{rows.length} companies · {rows.filter((company) => company.recency === 'Recent').length} recent signals</td></tr></tfoot></table></div></div>;
}
