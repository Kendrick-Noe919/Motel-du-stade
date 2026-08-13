import api from './api';

export async function getTypesChambre() {
  const { data } = await api.get('/types-chambre');
  return data;
}

export async function creerTypeChambre(type) {
  const { data } = await api.post('/types-chambre', type);
  return data;
}

export async function modifierTypeChambre(id, changements) {
  const { data } = await api.patch(`/types-chambre/${id}`, changements);
  return data;
}

export async function supprimerTypeChambre(id) {
  await api.delete(`/types-chambre/${id}`);
}