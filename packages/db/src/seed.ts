import { createCompany, listCompanies } from './repositories/companies.js';
const names = [['Moderna','MRNA'],['BioNTech','BNTX'],['Regeneron Pharmaceuticals','REGN'],['Vertex Pharmaceuticals','VRTX'],['Gilead Sciences','GILD'],['Amgen','AMGN'],['Alnylam Pharmaceuticals','ALNY'],['Illumina','ILMN'],['CRISPR Therapeutics','CRSP'],['Sana Biotechnology','SANA']] as const;
export function seedCompanies(): void { if (listCompanies().length) return; names.forEach(([name, ticker]) => createCompany({ name, ticker })); }
if (process.argv[1]?.endsWith('seed.ts')) { seedCompanies(); console.log(`seeded ${listCompanies().length} companies`); }
