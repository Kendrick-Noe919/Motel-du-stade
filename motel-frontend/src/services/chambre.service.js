import api from './api';

export async function getChambres() {
  const { data } = await api.get('/chambres');
  return data;
}

export async function creerChambre(chambre) {
  const { data } = await api.post('/chambres', chambre);
  return data;
}

export async function changerEtatChambre(id, etat) {
  const { data } = await api.patch(`/chambres/${id}/etat`, { etat });
  return data;
}
export async function modifierChambre(id, changements) {
  const { data } = await api.patch(`/chambres/${id}`, changements);
  return data;
}

export async function supprimerChambre(id) {
  await api.delete(`/chambres/${id}`);
}