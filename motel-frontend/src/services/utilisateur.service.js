import api from './api';

export async function getUtilisateurs() {
  const { data } = await api.get('/utilisateurs');
  return data;
}

export async function creerUtilisateur(utilisateur) {
  const { data } = await api.post('/utilisateurs', utilisateur);
  return data;
}

export async function modifierUtilisateur(id, changements) {
  const { data } = await api.patch(`/utilisateurs/${id}`, changements);
  return data;
}

export async function attribuerRole(utilisateurId, roleId) {
  const { data } = await api.post(`/utilisateurs/${utilisateurId}/roles`, { roleId });
  return data;
}

export async function retirerRole(utilisateurId, roleId) {
  await api.delete(`/utilisateurs/${utilisateurId}/roles/${roleId}`);
}
export async function supprimerUtilisateur(id) {
  await api.delete(`/utilisateurs/${id}`);
}