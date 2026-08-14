import api from './api';

export async function getCaissesUtilisateur(utilisateurId) {
  const { data } = await api.get(`/caisses/utilisateur/${utilisateurId}`);
  return data;
}

// On ouvre toujours sa propre caisse : le serveur prend l'utilisateur dans le jeton.
export async function ouvrirCaisse(soldeInitial) {
  const { data } = await api.post('/caisses/ouvrir', { soldeInitial });
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

export async function fermerCaisse(caisseId, montantCompte) {
  const { data } = await api.patch(`/caisses/${caisseId}/fermer`, { montantCompte });
  return data;
}

// Vue consolidée de toutes les caisses ouvertes (Administrateur et Manager)
export async function getCaissesOuvertes() {
  const { data } = await api.get('/caisses');
  return data;
}