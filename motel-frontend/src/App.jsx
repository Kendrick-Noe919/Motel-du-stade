import { Routes, Route } from 'react-router-dom';
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
import { rolesDuModule } from './config/acces';

// Chaque page est gardée par les rôles déclarés dans config/acces.js, la même
// source que le menu latéral. Taper une URL à la main ne contourne donc plus rien.
function Protegee({ path, children }) {
  return <RouteProtegee roles={rolesDuModule(path)}>{children}</RouteProtegee>;
}

function App() {
  return (
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
  );
}

export default App;
