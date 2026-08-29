import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ExternalLink, Plus, Search } from 'lucide-react';
import { listCompanies, type Company } from '../lib/api';

type Strength = 'strong' | 'medium' | 'weak';
type Recency = 'High' | 'Mid';
type RecordCompany = Company & { categories: string[]; development: string; recencyLabel: Recency; strength: Strength; url: string };

const DETAILS: Record<string, Omit<RecordCompany, keyof Company | 'recencyLabel'>> = {
  MRNA: { categories: ['Oncology', 'mRNA', 'Vaccines'], development: 'Phase 3 melanoma vaccine trial updated', strength: 'strong', url: 'https://www.modernatx.com' },
  PFE: { categories: ['Vaccines', 'Oncology'], development: 'Clinical pipeline update published', strength: 'medium', url: 'https://www.pfizer.com' },
  LLY: { categories: ['Metabolic', 'Neuroscience'], development: 'Late-stage pipeline results reported', strength: 'strong', url: 'https://www.lilly.com' },
  JNJ: { categories: ['MedTech', 'Immunology'], development: 'Regulatory filing added to record', strength: 'medium', url: 'https://www.jnj.com' },
  RHHBY: { categories: ['Diagnostics', 'Oncology'], development: 'New oncology study indexed', strength: 'strong', url: 'https://www.roche.com' },
  ABBV: { categories: ['Immunology', 'Oncology'], development: 'Investor pipeline commentary retrieved', strength: 'medium', url: 'https://www.abbvie.com' },
  MRK: { categories: ['Vaccines', 'Oncology'], development: 'Trial registry record refreshed', strength: 'strong', url: 'https://www.merck.com' },
  NVS: { categories: ['Oncology', 'Gene therapy'], development: 'Research publication added', strength: 'medium', url: 'https://www.novartis.com' },
  AMGN: { categories: ['Cardiology', 'Metabolic'], development: 'Cardiometabolic pipeline refresh', strength: 'medium', url: 'https://www.amgen.com' },
  BNTX: { categories: ['Oncology', 'mRNA'], development: 'Oncology collaboration update indexed', strength: 'strong', url: 'https://www.biontech.com' },
  REGN: { categories: ['Immunology', 'Oncology'], development: 'Antibody pipeline signal refreshed', strength: 'medium', url: 'https://www.regeneron.com' },
  VRTX: { categories: ['Rare disease'], development: 'Clinical readout indexed', strength: 'strong', url: 'https://www.vrtx.com' },
  GILD: { categories: ['Virology', 'Oncology'], development: 'Trial registry record refreshed', strength: 'medium', url: 'https://www.gilead.com' },
  ALNY: { categories: ['RNAi'], development: 'RNAi program update retrieved', strength: 'medium', url: 'https://www.alnylam.com' },
  ILMN: { categories: ['Genomics'], development: 'Sequencing partnership news indexed', strength: 'medium', url: 'https://www.illumina.com' },
  CRSP: { categories: ['Gene editing'], development: 'Editing trial update retrieved', strength: 'strong', url: 'https://www.crisprtx.com' },
  SANA: { categories: ['Cell therapy'], development: 'Cell therapy program update indexed', strength: 'medium', url: 'https://www.sana.com' },
  BMY: { categories: ['Oncology', 'Immunology'], development: 'Immuno-oncology filing added', strength: 'medium', url: 'https://www.bms.com' },
  AZN: { categories: ['Oncology', 'Vaccines'], development: 'Pipeline commentary retrieved', strength: 'strong', url: 'https://www.astrazeneca.com' },
  GH: { categories: ['Diagnostics', 'Oncology'], development: 'Liquid biopsy evidence indexed', strength: 'medium', url: 'https://www.guardanthealth.com' },
};

const fallback = (company: Company): Omit<RecordCompany, keyof Company | 'recencyLabel'> => ({
  categories: ['Healthcare'],
  development: 'Signal monitoring active',
  strength: 'medium',
  url: '#',
});

function labelRecency(value: Company['recency'] | undefined): Recency {
  return value === 'high' ? 'High' : 'Mid';
}

function Tag({ label, index }: { label: string; index: number }) {
  return <span className={`company-tag tag-${index % 5}`}>{label}</span>;
}

export function CompaniesPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'name' | 'recency'>('name');
  useEffect(() => { listCompanies().then(setCompanies); }, []);
  const rows = useMemo(() => companies
    .map((company) => {
      const ticker = company.ticker ?? '';
      const detail = DETAILS[ticker] ?? fallback(company);
      return {
        ...company,
        ...detail,
        recencyLabel: labelRecency(company.recency ?? (company.displayOrder % 2 === 0 ? 'high' : 'mid')),
      };
    })
    .filter((company) => `${company.name} ${company.ticker} ${company.categories.join(' ')} ${company.development}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'name'
      ? a.name.localeCompare(b.name)
      : a.recencyLabel.localeCompare(b.recencyLabel) || a.name.localeCompare(b.name)), [companies, query, sort]);

  return (
    <div className="records-page">
      <header className="page-header records-page-header">
        <div>
          <h1>Companies</h1>
          <p>Healthcare companies and the latest signals worth tracking.</p>
        </div>
        <button className="records-add-button"><Plus size={16} /> Add company</button>
      </header>
      <div className="records-toolbar">
        <label className="records-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies, categories, developments…" />
        </label>
        <button className="records-sort" onClick={() => setSort((value) => value === 'name' ? 'recency' : 'name')}>
          <ArrowUpDown size={15} /> Sort: {sort === 'name' ? 'Company' : 'Recency'}
        </button>
      </div>
      <div className="records-table-shell">
        <table className="records-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Categories</th>
              <th>Last development</th>
              <th>Recency</th>
              <th>Signal strength</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((company) => (
              <tr key={company.id} onClick={() => onOpen(company.id)}>
                <td>
                  <span className="company-initial">{company.name.slice(0, 1)}</span>
                  <span className="records-company-name">{company.name}</span>
                  <small>{company.ticker}</small>
                </td>
                <td>
                  <div className="company-tags">
                    {company.categories.map((category, index) => <Tag key={category} label={category} index={index} />)}
                  </div>
                </td>
                <td>{company.development}</td>
                <td><span className={`recency recency-${company.recencyLabel.toLowerCase()}`}>{company.recencyLabel}</span></td>
                <td>
                  <span className={`strength strength-${company.strength}`}>
                    <i />
                    {company.strength === 'strong' ? 'Very strong' : company.strength === 'medium' ? 'Needs review' : 'Weak'}
                  </span>
                </td>
                <td>
                  {company.url !== '#'
                    ? <a href={company.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><span>{company.url.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span><ExternalLink size={13} /></a>
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}>
                {rows.length} companies · {rows.filter((company) => company.recencyLabel === 'High').length} high · {rows.filter((company) => company.recencyLabel === 'Mid').length} mid
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
