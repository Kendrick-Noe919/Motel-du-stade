import api from './api';

export async function getRecettes(debut, fin) {
  const { data } = await api.get('/dashboard/recettes', { params: { debut, fin } });
  return data;
}

export async function getRapportJournee(date) {
  const { data } = await api.get('/caisses/rapport-journee', { params: { date } });
  return data;
}

export async function getJournal(filtres) {
  const { data } = await api.get('/journal', { params: filtres });
  return data;
}

export async function getFiltresJournal() {
  const { data } = await api.get('/journal/filtres');
  return data;
}
