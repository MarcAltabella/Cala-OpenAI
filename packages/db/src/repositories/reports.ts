import type { MomentumReport } from '@cala/contracts';
const reports = new Map<string, MomentumReport>();
export function insertMomentumReport(report: MomentumReport): MomentumReport { reports.set(report.companyId, report); return report; }
export const upsertMomentumReport = insertMomentumReport;
export function getMomentumReport(companyId: string): MomentumReport | undefined { return reports.get(companyId); }
export function resetReports(): void { reports.clear(); }
