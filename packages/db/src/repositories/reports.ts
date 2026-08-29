import type { MomentumReport } from '@cala/contracts';
const reports = new Map<string, MomentumReport>();
export function upsertMomentumReport(report: MomentumReport): MomentumReport { reports.set(report.companyId, report); return report; }
export function getMomentumReport(companyId: string): MomentumReport | undefined { return reports.get(companyId); }
