import { createContext, useContext, useState } from 'react';
import { connexion as connexionApi, deconnexion as deconnexionApi, getUtilisateurConnecte } from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // La session est lue au tout premier rendu, pas dans un effet.
  //
  // Avec un effet, le premier rendu se faisait avec `utilisateur` à null : la garde
  // de route concluait « non connecté » et renvoyait vers /login avant même que le
  // stockage soit consulté. Un simple Ctrl+R déconnectait donc l'utilisateur, alors
  // que son jeton était toujours là. L'initialiseur paresseux supprime cette fenêtre.
  const [utilisateur, setUtilisateur] = useState(getUtilisateurConnecte);

  async function connexion(email, motDePasse) {
    const data = await connexionApi(email, motDePasse);
    setUtilisateur(data.utilisateur);
    return data;
  }

  function deconnexion() {
    deconnexionApi();
    setUtilisateur(null);
  }

  // Définie ici, dans le composant : déclarée à l'extérieur, elle n'avait pas accès
  // à setUtilisateur et échouait dès qu'on modifiait son profil.
  function mettreAJourUtilisateur(changements) {
    setUtilisateur((precedent) => {
      const maj = { ...precedent, ...changements };
      localStorage.setItem('utilisateur', JSON.stringify(maj));
      return maj;
    });
  }

  const valeur = {
    utilisateur,
    connexion,
    deconnexion,
    mettreAJourUtilisateur,
    estConnecte: !!utilisateur,
    // Conservé pour la garde de route : la session étant lue de façon synchrone,
    // il n'y a plus d'attente, mais l'absence de cette clé faisait passer la garde
    // par la branche « non connecté » au lieu de la branche « chargement ».
    chargement: false,
  };

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

// Hook personnalisé : évite de réécrire useContext(AuthContext) partout
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}
