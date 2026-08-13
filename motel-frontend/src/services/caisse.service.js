import api from './api';

export async function getCaissesUtilisateur(utilisateurId) {
  const { data } = await api.get(`/caisses/utilisateur/${utilisateurId}`);
  return data;
}

export async function ouvrirCaisse(utilisateurId, soldeInitial) {
  const { data } = await api.post('/caisses/ouvrir', { utilisateurId, soldeInitial });
  return data;
}

export async function enregistrerMouvement(caisseId, mouvement) {
  const { data } = await api.post(`/caisses/${caisseId}/mouvements`, mouvement);
  return data;
}

export async function consulterSolde(caisseId) {
  const { data } = await api.get(`/caisses/${caisseId}/solde`);
  return data;
}

export async function fermerCaisse(caisseId) {
  const { data } = await api.patch(`/caisses/${caisseId}/fermer`);
  return data;
}