import { listEntities, listRelationships } from './entities.js';
export const listPeople = () => listEntities('person');
export const getPerson = (id: string) => listPeople().find(person => person.id === id);
export function listPeopleForCompany(companyId: string) {
  const people = listPeople();
  const companyEntityIds = new Set(listEntities('company').filter(company => company.id === companyId).map(company => company.id));
  return people.filter(person => listRelationships().some(edge => edge.type === 'WORKS_AT' && edge.fromEntityId === person.id && (edge.toEntityId === companyId || companyEntityIds.has(edge.toEntityId))));
}
