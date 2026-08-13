import { createContext, useContext, useState, useEffect } from 'react';
import { connexion as connexionApi, deconnexion as deconnexionApi, getUtilisateurConnecte } from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);

  // Au premier chargement de l'app, on vérifie si un utilisateur était déjà connecté
  useEffect(() => {
    const utilisateurStocke = getUtilisateurConnecte();
    setUtilisateur(utilisateurStocke);
    setChargement(false);
  }, []);

  async function connexion(email, motDePasse) {
    const data = await connexionApi(email, motDePasse);
    setUtilisateur(data.utilisateur);
    return data;
  }

  function deconnexion() {
    deconnexionApi();
    setUtilisateur(null);
  }

  const valeur = { utilisateur, connexion, deconnexion, mettreAJourUtilisateur, estConnecte: !!utilisateur };

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

// Hook personnalisé — évite de réécrire useContext(AuthContext) partout
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}
function mettreAJourUtilisateur(changements) {
  setUtilisateur((prev) => {
    const maj = { ...prev, ...changements };
    localStorage.setItem('utilisateur', JSON.stringify(maj));
    return maj;
  });
}