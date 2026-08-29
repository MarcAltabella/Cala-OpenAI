import { ArrowRightIcon, SearchIcon, StarIcon } from '@iconicicons/react';
import type { Company } from '@cala/contracts';

type CompanyCard = Company & {
  focus: string;
  logo: string;
};

const seededCompanies: CompanyCard[] = [
  {
    id: 'moderna',
    name: 'Moderna',
    ticker: 'MRNA',
    displayOrder: 0,
    createdAt: '2026-08-29T00:00:00.000Z',
    focus: 'mRNA medicines & vaccines',
    logo: 'https://raw.githubusercontent.com/ln-dev7/logos-apps/master/logos/moderna.svg',
  },
  {
    id: 'pfizer',
    name: 'Pfizer',
    ticker: 'PFE',
    displayOrder: 1,
    createdAt: '2026-08-29T00:00:00.000Z',
    focus: 'Oncology & vaccines',
    logo: 'https://raw.githubusercontent.com/ln-dev7/logos-apps/master/logos/pfizer.svg',
  },
  {
    id: 'novartis',
    name: 'Novartis',
    ticker: 'NVS',
    displayOrder: 2,
    createdAt: '2026-08-29T00:00:00.000Z',
    focus: 'Innovative medicines',
    logo: 'https://raw.githubusercontent.com/ln-dev7/logos-apps/master/logos/novartis.svg',
  },
  {
    id: 'amgen',
    name: 'Amgen',
    ticker: 'AMGN',
    displayOrder: 3,
    createdAt: '2026-08-29T00:00:00.000Z',
    focus: 'Biotechnology therapeutics',
    logo: 'https://raw.githubusercontent.com/ln-dev7/logos-apps/master/logos/amgen.svg',
  },
  {
    id: 'regeneron',
    name: 'Regeneron',
    ticker: 'REGN',
    displayOrder: 4,
    createdAt: '2026-08-29T00:00:00.000Z',
    focus: 'Genetic medicine & immunology',
    logo: 'https://raw.githubusercontent.com/ln-dev7/logos-apps/master/logos/regeneron.svg',
  },
  {
    id: 'vertex',
    name: 'Vertex',
    ticker: 'VRTX',
    displayOrder: 5,
    createdAt: '2026-08-29T00:00:00.000Z',
    focus: 'Serious disease medicines',
    logo: 'https://raw.githubusercontent.com/ln-dev7/logos-apps/master/logos/vertex.svg',
  },
];

type CompaniesPageProps = {
  companies?: CompanyCard[];
};

export function CompaniesPage({ companies = seededCompanies }: CompaniesPageProps) {
  const orderedCompanies = [...companies].sort(
    (left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name),
  );

  return (
    <main className="min-h-full bg-[#fbfcfa] text-slate-950">
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 sm:pt-14">
        <div className="relative overflow-hidden rounded-2xl border border-[#dce8c8] bg-[#f0f6df] px-6 py-8 shadow-sm sm:px-9">
          <div className="absolute -right-6 -top-12 size-44 rounded-full border-[18px] border-[#d8f25b]/70" />
          <div className="absolute bottom-4 right-24 h-14 w-24 rotate-[-12deg] rounded-[50%] border-2 border-dashed border-[#4d8170]/45" />
          <div className="relative max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-md bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#386454] shadow-xs">
              <StarIcon aria-hidden="true" className="size-3.5" />
              Your market watchlist
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#153b33] sm:text-4xl">
              Find the signals before the market does.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#43675b]">
              Trace the research, trial, and regulatory momentum behind tomorrow&apos;s healthcare stories.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#5a8475]">Watchlist</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Companies in motion</h2>
          </div>
          <label className="relative block sm:w-72">
            <span className="sr-only">Search companies</span>
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-md border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-xs outline-none placeholder:text-slate-400 focus:border-[#4d8170] focus:ring-2 focus:ring-[#d8f25b]"
              placeholder="Search watchlist"
              type="search"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orderedCompanies.map((company, index) => (
            <a
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a9c99f] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#4d8170] focus:ring-offset-2"
              href={`/companies/${company.id}`}
              key={company.id}
            >
              {index === 0 && (
                <span className="absolute right-4 top-4 rounded-md bg-[#eaf2d5] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#386454]">
                  Pinned
                </span>
              )}
              <div className="relative flex size-12 items-center justify-center rounded-md border border-slate-100 bg-slate-50 p-2 shadow-xs">
                <img
                  alt={`${company.name} logo`}
                  className="relative z-10 max-h-full max-w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                  src={company.logo}
                />
                <span aria-hidden="true" className="absolute text-lg font-bold text-[#386454]">{company.name.charAt(0)}</span>
              </div>
              <div className="mt-7">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5a8475]">
                  {company.ticker ?? 'Private'}
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{company.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{company.focus}</p>
              </div>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#386454]">
                View momentum <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
