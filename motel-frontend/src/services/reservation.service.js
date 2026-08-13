import api from './api';

export async function getReservations() {
  const { data } = await api.get('/reservations');
  return data;
}

export async function consulterDisponibilites(dateArrivee, dateDepart) {
  const { data } = await api.get('/reservations/disponibilites', {
    params: { dateArrivee, dateDepart },
  });
  return data;
}

export async function creerReservation(reservation) {
  const { data } = await api.post('/reservations', reservation);
  return data;
}

export async function annulerReservation(id) {
  const { data } = await api.patch(`/reservations/${id}/annuler`);
  return data;
}
export async function modifierReservation(id, changements) {
  const { data } = await api.patch(`/reservations/${id}`, changements);
  return data;
}
export async function supprimerReservation(id) {
  await api.delete(`/reservations/${id}`);
}

export async function viderReservationsAnnulees() {
  const { data } = await api.delete('/reservations/annulees');
  return data;
}