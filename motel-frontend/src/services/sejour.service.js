import api from './api';

export async function checkIn(reservationId) {
  const { data } = await api.post('/sejours/check-in', { reservationId });
  return data;
}

export async function checkOut(sejourId) {
  const { data } = await api.patch(`/sejours/${sejourId}/check-out`);
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