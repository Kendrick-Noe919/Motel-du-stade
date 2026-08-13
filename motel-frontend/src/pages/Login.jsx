import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Alerte from '../components/ui/Alerte';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const { connexion } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    setEnCours(true);
    try {
      await connexion(email, motDePasse);
      navigate('/');
    } catch (err) {
      setErreur(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--surface)' }}>
      {/* ---------- Formulaire ---------- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
        <form onSubmit={handleSubmit} style={{ width: 380, maxWidth: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--gradient-signal)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Motel du Stade</span>
          </div>

          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Connexion</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13.5, marginBottom: 'var(--space-6)' }}>
            Accédez à votre espace de gestion du motel.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Champ label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@motel.com" required autoFocus style={styleInput} {...focusHandlers} />
            </Champ>
            <Champ label="Mot de passe">
              <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required style={styleInput} {...focusHandlers} />
            </Champ>

            {erreur && <Alerte variante="erreur">{erreur}</Alerte>}

            <Button type="submit" arrondi enCours={enCours} style={{ width: '100%', justifyContent: 'center', height: 46, marginTop: 'var(--space-2)' }}>
              Se connecter
            </Button>
          </div>
        </form>
      </div>

      {/* ---------- Panneau mint : aperçu de l'app ---------- */}
      <div style={{
        background: 'var(--signal-dim)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)', position: 'relative', overflow: 'hidden',
      }}>
        {/* Mini-cartes illustratives, façon aperçu produit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 'var(--space-6)', width: 320 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 16, boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: 11, color: 'var(--slate)', margin: 0 }}>Taux d'occupation</p>
            <p className="mono" style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 8px', color: 'var(--moss)' }}>78%</p>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--stone-dim)' }}>
              <div style={{ width: '78%', height: '100%', borderRadius: 999, background: 'var(--gradient-signal)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 16, boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 11, color: 'var(--slate)', margin: 0 }}>Réservations</p>
              <p className="mono" style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0' }}>12</p>
            </div>
            <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 16, boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 11, color: 'var(--slate)', margin: 0 }}>Revenus du jour</p>
              <p className="mono" style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0', color: 'var(--signal-dark)' }}>145 000</p>
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 22, textAlign: 'center', color: 'var(--moss)', marginBottom: 8 }}>
          Pilotez votre motel, simplement
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--slate)', fontSize: 13.5, maxWidth: 320 }}>
          Réservations, paiements, caisse et personnel — tout au même endroit, en temps réel.
        </p>
      </div>
    </div>
  );
}