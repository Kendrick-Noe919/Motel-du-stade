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
        <Route path="/" element={<TableauDeBord />} />
        <Route path="/chambres" element={<Chambres />} />
        <Route path="/types-chambre" element={<TypesChambre />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/paiements" element={<Paiements />} />
        <Route path="/caisse" element={<Caisse />} />
        <Route path="/utilisateurs" element={<Utilisateurs />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route path="/services" element={<Services />} />
        <Route path="/ventes" element={<Ventes />} />
      </Route>
    </Routes>
  );
}

export default App;