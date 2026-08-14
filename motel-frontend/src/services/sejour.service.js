import api from './api';

export async function checkIn(reservationId) {
  const { data } = await api.post('/sejours/check-in', { reservationId });
  return data;
}

// forcerSansPaiement : le serveur refuse le départ tant qu'il reste un solde dû
// (consommations comprises). Le réceptionniste peut passer outre en connaissance de cause.
export async function checkOut(sejourId, forcerSansPaiement = false) {
  const { data } = await api.patch(`/sejours/${sejourId}/check-out`, { forcerSansPaiement });
  return data;
}

export async function getSejourParReservation(reservationId) {
  const { data } = await api.get(`/sejours/reservation/${reservationId}`);
  return data;
}

export async function ajouterConsommation(sejourId, serviceId, quantite) {
  const { data } = await api.post(`/sejours/${sejourId}/consommations`, { serviceId, quantite });
  return data;
}

export async function supprimerConsommation(id) {
  await api.delete(`/services/consommations/${id}`);
}
export async function ajouterHeuresSupplementaires(sejourId, nombreHeures) {
  const { data } = await api.post(`/sejours/${sejourId}/heures-supplementaires`, { nombreHeures });
  return data;
}

// Prolongation d'un séjour à la nuitée : le serveur repousse la date de départ,
// facture les nuits au tarif de la chambre et refuse si la chambre est réservée après.
export async function ajouterNuitsSupplementaires(sejourId, nombreNuits) {
  const { data } = await api.post(`/sejours/${sejourId}/nuits-supplementaires`, { nombreNuits });
  return data;
}