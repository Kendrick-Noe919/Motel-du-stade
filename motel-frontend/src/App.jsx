import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import RouteProtegee from './components/RouteProtegee';
import TableauDeBord from './pages/TableauDeBord';
import Chambres from './pages/Chambres';
import TypesChambre from './pages/TypesChambre';
import Reservations from './pages/Reservations';
import Clients from './pages/Clients';
import Paiements from './pages/Paiements';
import Caisse from './pages/Caisse';
import Utilisateurs from './pages/Utilisateurs';
import Profil from './pages/Profil';
import Parametres from './pages/Parametres';
import Services from './pages/Services';
import Ventes from './pages/Ventes';
import Recettes from './pages/Recettes';
import Historique from './pages/Historique';
import Indisponible from './pages/Indisponible';
import ControleSysteme from './pages/ControleSysteme';
import { lireStatutPublic } from './services/controle.service';
import { rolesDuModule } from './config/acces';

// Adresse de la console privée de licence. Volontairement imprévisible et absente de
// tout menu : on n'y accède qu'en connaissant ce chemin. Changez-le pour un autre si
// vous le souhaitez — c'est le seul endroit à modifier.
const CHEMIN_CONSOLE = '/console-mtds-9f3a7c21';

// Chaque page est gardée par les rôles déclarés dans config/acces.js, la même
// source que le menu latéral. Taper une URL à la main ne contourne donc plus rien.
function Protegee({ path, children }) {
  return <RouteProtegee roles={rolesDuModule(path)}>{children}</RouteProtegee>;
}

// La porte de licence : au chargement, elle demande au serveur si l'application est
// active. Suspendue, elle n'affiche que la page de blocage et ne monte aucun écran
// métier. Active, elle laisse passer vers l'application normale.
function PorteLicence({ children }) {
  const [statut, setStatut] = useState(null); // null = en cours de vérification

  useEffect(() => {
    let vivant = true;
    lireStatutPublic()
      .then((s) => { if (vivant) setStatut(s); })
      // Serveur injoignable : on ne bloque pas le client sur une panne réseau,
      // on laisse l'application tenter de se charger normalement.
      .catch(() => { if (vivant) setStatut({ actif: true }); });
    return () => { vivant = false; };
  }, []);

  if (statut === null) return null; // court instant de vérification, sans clignotement
  if (!statut.actif) return <Indisponible message={statut.message} />;
  return children;
}

function App() {
  const location = useLocation();

  // La console reste accessible quel que soit l'état de la licence : c'est par elle
  // qu'on réactive une application suspendue.
  if (location.pathname === CHEMIN_CONSOLE) {
    return (
      <Routes>
        <Route path={CHEMIN_CONSOLE} element={<ControleSysteme />} />
      </Routes>
    );
  }

  return (
    <PorteLicence>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <RouteProtegee>
              <Layout />
            </RouteProtegee>
          }
        >
          <Route path="/" element={<Protegee path="/"><TableauDeBord /></Protegee>} />
          <Route path="/chambres" element={<Protegee path="/chambres"><Chambres /></Protegee>} />
          <Route path="/types-chambre" element={<Protegee path="/types-chambre"><TypesChambre /></Protegee>} />
          <Route path="/reservations" element={<Protegee path="/reservations"><Reservations /></Protegee>} />
          <Route path="/clients" element={<Protegee path="/clients"><Clients /></Protegee>} />
          <Route path="/paiements" element={<Protegee path="/paiements"><Paiements /></Protegee>} />
          <Route path="/caisse" element={<Protegee path="/caisse"><Caisse /></Protegee>} />
          <Route path="/utilisateurs" element={<Protegee path="/utilisateurs"><Utilisateurs /></Protegee>} />
          <Route path="/parametres" element={<Protegee path="/parametres"><Parametres /></Protegee>} />
          <Route path="/services" element={<Protegee path="/services"><Services /></Protegee>} />
          <Route path="/ventes" element={<Protegee path="/ventes"><Ventes /></Protegee>} />
          <Route path="/recettes" element={<Protegee path="/recettes"><Recettes /></Protegee>} />
          <Route path="/historique" element={<Protegee path="/historique"><Historique /></Protegee>} />

          {/* Accessible à tout le personnel connecté */}
          <Route path="/profil" element={<Profil />} />
        </Route>
      </Routes>
    </PorteLicence>
  );
}

export default App;
