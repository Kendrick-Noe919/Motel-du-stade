import api from './api';

export async function creerVente(lignes) {
  const { data } = await api.post('/ventes', { lignes });
  return data;
}

export async function getVentes() {
  const { data } = await api.get('/ventes');
  return data;
}