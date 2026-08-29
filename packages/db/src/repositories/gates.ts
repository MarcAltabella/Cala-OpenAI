import type { HealthcareGate } from '@cala/contracts';
import { randomUUID } from 'node:crypto';
const gates: HealthcareGate[] = [];
export function insertHealthcareGate(input: Omit<HealthcareGate, 'id'>): HealthcareGate { const gate = { id: randomUUID(), ...input }; gates.push(gate); return gate; }
export function listHealthcareGates(developmentId?: string): HealthcareGate[] { return gates.filter(gate => !developmentId || gate.developmentId === developmentId); }
