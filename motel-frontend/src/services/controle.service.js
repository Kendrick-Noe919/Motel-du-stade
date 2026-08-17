import axios from 'axios';

// Instance à part, VOLONTAIREMENT sans les intercepteurs de api.js : la console de
// licence ne partage rien avec l'authentification de l'application. Une erreur ici
// ne doit pas déconnecter un employé ni renvoyer vers /login.
const apiControle = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Jeton rangé sous une clé distincte de celle de l'application.
const CLE_JETON = 'controle_token';

apiControle.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(CLE_JETON);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Lu au chargement de l'application pour savoir s'il faut afficher la page de blocage.
export async function lireStatutPublic() {
  const { data } = await apiControle.get('/systeme/statut');
  return data; // { actif, message }
}

export async function connexionConsole(identifiant, motDePasse) {
  const { data } = await apiControle.post('/systeme/acces', { identifiant, motDePasse });
  // sessionStorage : la session de console s'efface à la fermeture de l'onglet, elle
  // ne traîne pas sur la machine.
  sessionStorage.setItem(CLE_JETON, data.token);
  return data; // { token, etat }
}

export function deconnexionConsole() {
  sessionStorage.removeItem(CLE_JETON);
}

export function estConnecteConsole() {
  return !!sessionStorage.getItem(CLE_JETON);
}

export async function lireEtat() {
  const { data } = await apiControle.get('/systeme/etat');
  return data;
}

export async function basculerEtat(actif, message) {
  const { data } = await apiControle.post('/systeme/basculer', { actif, message });
  return data;
}
