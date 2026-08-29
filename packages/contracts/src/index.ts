/**
 * Canonical cross-package data contracts. UI-only display metadata belongs in
 * the consuming application instead of expanding these transport records.
 */
export type Company = {
  id: string;
  name: string;
  ticker: string | null;
  displayOrder: number;
  createdAt: string;
};
