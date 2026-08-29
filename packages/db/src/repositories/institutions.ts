import { listEntities } from './entities.js';
export const listInstitutions = () => listEntities('institution');
export const getInstitution = (id: string) => listInstitutions().find(institution => institution.id === id);
