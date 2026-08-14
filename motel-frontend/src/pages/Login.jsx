import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIsTablet } from '../hooks/useMediaQuery';
import Button from '../components/ui/Button';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Alerte from '../components/ui/Alerte';

// Le visuel d'accueil.
//
// Le panneau de droite montrait un faux tableau de bord — taux d'occupation,
// réservations du jour, revenus. Chiffres inventés, mais rien ne le disait au
// visiteur : sur une page accessible avant toute connexion, cela donnait à lire
// ce qui ressemblait à l'activité de l'établissement, et invitait à les brancher
// un jour sur les vraies données.
//
// Image hébergée chez Unsplash le temps de la mise au point. Pour la servir
// depuis le projet : déposer le fichier dans `public/images/`, puis remplacer
// cette constante par '/images/auberge.jpg'. Rien d'autre à changer.
const IMAGE_ACCUEIL = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [imageChargee, setImageChargee] = useState(false);
  const estTablette = useIsTablet();

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

  // Les éléments du formulaire se posent l'un après l'autre. Le décalage reste
  // court : au-delà, on attend la page au lieu de la regarder arriver.
  const cascade = (rang) => ({ animationDelay: `${rang * 70}ms` });

  return (
    <div style={{
      minHeight: '100vh', display: 'grid',
      gridTemplateColumns: estTablette ? '1fr' : '1fr 1fr',
      background: 'var(--surface)',
    }}>
      {/* ---------- Formulaire ---------- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
        <form onSubmit={handleSubmit} style={{ width: 380, maxWidth: '100%' }}>
          <div className="anim-montee" style={{ ...cascade(0), display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--gradient-signal)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>Motel du Stade</span>
          </div>

          <h1 className="anim-montee" style={{ ...cascade(1), fontSize: 26, marginBottom: 6 }}>Connexion</h1>
          <p className="anim-montee" style={{ ...cascade(2), color: 'var(--slate)', fontSize: 13.5, marginBottom: 'var(--space-6)' }}>
            Accédez à votre espace de gestion du motel.
          </p>

          <div className="anim-montee" style={{ ...cascade(3), display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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

      {/* ---------- Panneau d'accueil : image, sans aucune donnée de l'établissement ---------- */}
      {!estTablette && (
        <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--moss)' }}>
          {/* Le fond vert tient la place pendant le chargement : sans lui, un carré
              blanc clignote avant l'image. */}
          <img
            src={IMAGE_ACCUEIL}
            alt="Façade d'une auberge et sa terrasse au bord de la piscine"
            onLoad={() => setImageChargee(true)}
            className={imageChargee ? 'anim-zoom' : undefined}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: imageChargee ? 1 : 0,
            }}
          />

          {/* Voile dégradé : il assoit le texte blanc quelle que soit la photo, et
              rattache l'image à la couleur de la marque. */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(20,83,45,0.15) 0%, rgba(20,83,45,0.55) 55%, rgba(20,83,45,0.88) 100%)',
          }} />

          <div className="anim-fondu" style={{
            position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end', padding: 'var(--space-8)', animationDelay: '350ms',
          }}>
            <h2 style={{ fontSize: 30, color: '#fff', marginBottom: 10, maxWidth: 420, lineHeight: 1.2 }}>
              Pilotez votre motel, simplement
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.86)', fontSize: 14.5, maxWidth: 420, margin: 0 }}>
              Réservations, séjours, paiements et caisse : tout au même endroit,
              pour toute votre équipe.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
