import api from './api';

export async function getParametres() {
  const { data } = await api.get('/parametres');
  return data;
}

export async function modifierParametre(cle, valeur) {
  const { data } = await api.patch(`/parametres/${cle}`, { valeur });
  return data;
}
