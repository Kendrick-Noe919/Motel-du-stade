import api from './api';

export async function connexion(email, motDePasse) {
  const { data } = await api.post('/auth/connexion', { email, motDePasse });
  localStorage.setItem('token', data.token);
  localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));
  return data;
}

export function deconnexion() {
  localStorage.removeItem('token');
  localStorage.removeItem('utilisateur');
}

export function getUtilisateurConnecte() {
  const data = localStorage.getItem('utilisateur');
  return data ? JSON.parse(data) : null;
}

export function estConnecte() {
  return !!localStorage.getItem('token');
}
export async function getMonProfil() {
  const { data } = await api.get('/auth/moi');
  return data;
}

export async function modifierMonProfil(changements) {
  const { data } = await api.patch('/auth/moi', changements);
  return data;
}

export async function changerMotDePasse(motDePasseActuel, nouveauMotDePasse) {
  const { data } = await api.patch('/auth/moi/mot-de-passe', { motDePasseActuel, nouveauMotDePasse });
  return data;
}