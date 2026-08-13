import api from './api';

export async function getClients() {
  const { data } = await api.get('/clients');
  return data;
}

export async function rechercherClients(q) {
  const { data } = await api.get('/clients/recherche', { params: { q } });
  return data;
}

export async function inscrireClient(client) {
  const { data } = await api.post('/clients/inscription', client);
  return data;
}

export async function enregistrerClientRapide(client) {
  const { data } = await api.post('/clients/rapide', client);
  return data;
}

export async function getHistoriqueClient(id) {
  const { data } = await api.get(`/clients/${id}/historique`);
  return data;
}

export async function modifierClient(id, changements) {
  const { data } = await api.patch(`/clients/${id}`, changements);
  return data;
}

export async function supprimerClient(id) {
  await api.delete(`/clients/${id}`);
}