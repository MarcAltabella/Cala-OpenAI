import { listEntities } from './entities.js';
export const listPeople = () => listEntities('person');
export const getPerson = (id: string) => listPeople().find(person => person.id === id);
