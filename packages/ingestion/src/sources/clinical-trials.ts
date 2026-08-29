import type { Company } from '@cala/contracts';
import { contentHash, fetchJson, normalizeText } from '../normalize.js';
import { SourceAdapterError, type NormalizedDocument, type SourceAdapter, type SourceContext } from '../types.js';

const PROVIDER = 'clinicaltrials';
const STUDIES = 'https://clinicaltrials.gov/api/v2/studies';

type Study = {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string };
    statusModule?: { studyFirstPostDateStruct?: { date?: string } };
    descriptionModule?: { briefSummary?: string };
    sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
  };
};
type StudiesPayload = { studies?: Study[] };

// Parse a ClinicalTrials.gov v2 studies payload into normalized trial documents.
export function parseClinicalTrials(payload: unknown, company: Company): NormalizedDocument[] {
  const studies = (payload as StudiesPayload)?.studies;
  if (!Array.isArray(studies)) return [];
  const docs: NormalizedDocument[] = [];
  for (const study of studies) {
    const id = study.protocolSection?.identificationModule?.nctId;
    if (!id) continue;
    const title = study.protocolSection?.identificationModule?.briefTitle ?? '';
    const summary = study.protocolSection?.descriptionModule?.briefSummary ?? '';
    const text = normalizeText([title, summary].filter(Boolean).join('. '));
    docs.push({
      provider: PROVIDER,
      providerId: id,
      companyId: company.id,
      url: `https://clinicaltrials.gov/study/${id}`,
      publishedAt: study.protocolSection?.statusModule?.studyFirstPostDateStruct?.date
        ? new Date(study.protocolSection.statusModule.studyFirstPostDateStruct.date).toISOString()
        : null,
      title,
      text,
      rawPayload: study,
      contentHash: contentHash(title, text),
      documentKind: 'trial',
    });
  }
  return docs;
}

export function createClinicalTrialsAdapter(): SourceAdapter {
  return {
    provider: PROVIDER,
    async fetch(context: SourceContext): Promise<NormalizedDocument[]> {
      try {
        const term = encodeURIComponent(context.company.name);
        const payload = await fetchJson(`${STUDIES}?query.term=${term}&pageSize=50`, context);
        return parseClinicalTrials(payload, context.company);
      } catch (error) {
        throw new SourceAdapterError(PROVIDER, 'failed to fetch ClinicalTrials deltas', error);
      }
    },
  };
}
