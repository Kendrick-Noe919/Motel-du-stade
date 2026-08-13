import api from './api';

export async function getRoles() {
  const { data } = await api.get('/roles');
  return data;
}
export async function creerRole(role) {
  const { data } = await api.post('/roles', role);
  return data;
}

export async function supprimerRole(id) {
  await api.delete(`/roles/${id}`);
}