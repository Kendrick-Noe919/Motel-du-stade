import api from './api';

export async function getParametres() {
  const { data } = await api.get('/parametres');
  return data;
}

export async function modifierParametre(cle, valeur) {
  const { data } = await api.patch(`/parametres/${cle}`, { valeur });
  return data;
}

// Les types de notification et leur état. La liste vient du catalogue du serveur :
// un type ajouté au code apparaît ici sans rien à faire de plus.
export async function getReglagesNotifications() {
  const { data } = await api.get('/parametres/notifications');
  return data;
}

export async function basculerNotification(type, actif) {
  const { data } = await api.patch(`/parametres/notifications/${type}`, { actif });
  return data;
}
