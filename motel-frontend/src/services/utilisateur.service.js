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

// Ce que le compte laisse derrière lui, et s'il est supprimable. Interrogé avant
// d'afficher le bouton : mieux vaut expliquer d'avance que refuser après le clic.
export async function verifierSuppression(id) {
  const { data } = await api.get(`/utilisateurs/${id}/suppression-possible`);
  return data;
}

// Télécharge le dossier complet du compte. Le navigateur enregistre le fichier :
// c'est la copie qui reste à l'administrateur une fois le compte effacé.
export async function telechargerArchive(id, nomFichier) {
  const reponse = await api.get(`/utilisateurs/${id}/archive`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([reponse.data], { type: 'application/json' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

export async function supprimerUtilisateur(id) {
  const { data } = await api.delete(`/utilisateurs/${id}`);
  return data;
}
