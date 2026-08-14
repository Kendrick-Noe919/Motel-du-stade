import api from './api';

export async function getNotifications() {
  const { data } = await api.get('/notifications');
  return data;
}

export async function marquerLue(id) {
  const { data } = await api.patch(`/notifications/${id}/lue`);
  return data;
}

export async function marquerToutesLues() {
  const { data } = await api.patch('/notifications/toutes-lues');
  return data;
}
