import api from './api';

export async function creerVente(lignes) {
  const { data } = await api.post('/ventes', { lignes });
  return data;
}

export async function getVentes() {
  const { data } = await api.get('/ventes');
  return data;
}

// Clients actuellement logés : les notes ouvertes auxquelles le bar peut rattacher
// une commande.
export async function getChambresOccupees() {
  const { data } = await api.get('/ventes/chambres-occupees');
  return data;
}

// Les dernières commandes portées sur des notes : elles ne sont pas dans
// l'historique des ventes puisque rien n'a été encaissé.
export async function getConsommationsSurChambre() {
  const { data } = await api.get('/ventes/sur-chambre');
  return data;
}

// La commande part sur la note de la chambre : rien n'est encaissé maintenant,
// le montant sera réglé au moment du départ du client.
export async function envoyerSurChambre(sejourId, lignes) {
  const { data } = await api.post('/ventes/sur-chambre', { sejourId, lignes });
  return data;
}