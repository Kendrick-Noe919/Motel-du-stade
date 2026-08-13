import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Intercepteur : ajoute automatiquement le token à CHAQUE requête, si présent
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur : si le token est invalide/expiré (401), on déconnecte automatiquement
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('utilisateur');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;