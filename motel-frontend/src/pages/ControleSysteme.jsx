import { useEffect, useState } from 'react';
import {
  connexionConsole, deconnexionConsole, estConnecteConsole, lireEtat, basculerEtat,
} from '../services/controle.service';
import Button from '../components/ui/Button';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Alerte from '../components/ui/Alerte';

// Console de licence. Page volontairement absente du menu, de config/acces.js et de
// tout écran de l'application : on n'y arrive qu'en connaissant son adresse. La vraie
// serrure reste le couple identifiant / mot de passe, vérifié côté serveur contre des
// valeurs qui ne vivent que dans le .env — jamais dans la base.
export default function ControleSysteme() {
  const [connecte, setConnecte] = useState(estConnecteConsole());
  const [etat, setEtat] = useState(null);
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [messagePerso, setMessagePerso] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!connecte) return;
    lireEtat()
      .then((e) => { setEtat(e); setMessagePerso(e.message || ''); })
      .catch(() => { deconnexionConsole(); setConnecte(false); });
  }, [connecte]);

  async function seConnecter(e) {
    e.preventDefault();
    setErreur(''); setEnCours(true);
    try {
      const { etat: etatInitial } = await connexionConsole(identifiant, motDePasse);
      setEtat(etatInitial);
      setMessagePerso(etatInitial.message || '');
      setConnecte(true);
      setMotDePasse('');
    } catch (err) {
      setErreur(err.response?.data?.message || 'Accès refusé');
    } finally {
      setEnCours(false);
    }
  }

  async function basculer(actif) {
    setErreur(''); setEnCours(true);
    try {
      // Le message n'accompagne que la suspension ; une réactivation le remet à zéro.
      const nouvel = await basculerEtat(actif, actif ? null : (messagePerso.trim() || null));
      setEtat(nouvel);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Opération impossible');
    } finally {
      setEnCours(false);
    }
  }

  function seDeconnecter() {
    deconnexionConsole();
    setConnecte(false);
    setEtat(null);
    setIdentifiant('');
  }

  // ---------- Écran de connexion ----------
  if (!connecte) {
    return (
      <Cadre>
        <form onSubmit={seConnecter} style={{ width: 360, maxWidth: '100%' }}>
          <p style={etiquette}>Console privée</p>
          <h1 style={{ fontSize: 24, marginBottom: 'var(--space-6)' }}>Contrôle d'accès</h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Champ label="Identifiant">
              <input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)}
                required autoFocus autoComplete="off" style={styleInput} {...focusHandlers} />
            </Champ>
            <Champ label="Mot de passe">
              <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
                required autoComplete="off" style={styleInput} {...focusHandlers} />
            </Champ>

            {erreur && <Alerte variante="erreur">{erreur}</Alerte>}

            <Button type="submit" arrondi enCours={enCours}
              style={{ width: '100%', justifyContent: 'center', height: 46 }}>
              Entrer
            </Button>
          </div>
        </form>
      </Cadre>
    );
  }

  // ---------- Tableau de contrôle ----------
  const actif = etat?.actif !== false;

  return (
    <Cadre>
      <div style={{ width: 440, maxWidth: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <p style={{ ...etiquette, marginBottom: 0 }}>Console privée</p>
          <button onClick={seDeconnecter} style={{
            background: 'none', border: 'none', color: 'var(--slate)', fontSize: 13,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            Quitter
          </button>
        </div>

        <div style={{
          border: '1.5px solid var(--line)', borderRadius: 'var(--radius-md, 12px)',
          padding: 'var(--space-6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-5)' }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: actif ? 'var(--moss)' : 'var(--danger)',
              boxShadow: `0 0 0 4px ${actif ? 'rgba(20,83,45,0.15)' : 'rgba(220,38,38,0.15)'}`,
            }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>
                {actif ? 'Application active' : 'Application suspendue'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate)' }}>
                {actif ? 'Le client utilise le logiciel normalement.' : "Le client voit la page de blocage."}
              </div>
            </div>
          </div>

          {/* Le message n'a de sens que pour une suspension : on ne le montre que dans ce cas. */}
          {actif && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <Champ label="Message affiché au client (optionnel)"
                hint="Laissez vide pour le message par défaut sur l'échéance de paiement.">
                <textarea value={messagePerso} onChange={(e) => setMessagePerso(e.target.value)}
                  rows={3} style={{ ...styleInput, height: 'auto', padding: '12px 16px', resize: 'vertical' }}
                  {...focusHandlers} />
              </Champ>
            </div>
          )}

          {erreur && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="erreur">{erreur}</Alerte></div>}

          {actif ? (
            <Button variante="danger" arrondi enCours={enCours} onClick={() => basculer(false)}
              style={{ width: '100%', justifyContent: 'center', height: 46 }}>
              Suspendre l'application
            </Button>
          ) : (
            <Button arrondi enCours={enCours} onClick={() => basculer(true)}
              style={{ width: '100%', justifyContent: 'center', height: 46 }}>
              Réactiver l'application
            </Button>
          )}

          {etat?.modifieLe && (
            <p style={{ fontSize: 12, color: 'var(--slate-light)', textAlign: 'center', marginTop: 'var(--space-4)', marginBottom: 0 }}>
              Dernier changement : {new Date(etat.modifieLe).toLocaleString('fr-FR')}
            </p>
          )}
        </div>
      </div>
    </Cadre>
  );
}

const etiquette = {
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: 'var(--slate-light)', marginBottom: 'var(--space-3)',
};

function Cadre({ children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-6)', background: 'var(--surface)',
    }}>
      {children}
    </div>
  );
}
