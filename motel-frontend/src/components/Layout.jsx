import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getChambres } from '../services/chambre.service';
import { useIsTablet } from '../hooks/useMediaQuery';

const TITRES_PAGES = {
  '/': 'Tableau de bord', '/chambres': 'Chambres', '/types-chambre': 'Types de chambre',
  '/reservations': 'Réservations', '/clients': 'Clients', '/paiements': 'Paiements',
  '/caisse': 'Caisse', '/utilisateurs': 'Utilisateurs', '/parametres': 'Paramètres généraux',
  '/profil': 'Mon profil', '/services': 'Services supplémentaires',
  '/services': 'Services supplémentaires',
  '/ventes': 'Vente au bar',
};

const MENU = [
  { label: 'Tableau de bord', path: '/', icone: '◇', roles: ['Administrateur', 'Manager', 'Receptionniste', 'Caissier', 'Barman'] },
  { label: 'Chambres', path: '/chambres', icone: '▭', roles: ['Administrateur', 'Manager', 'Receptionniste'] },
  { label: 'Types de chambre', path: '/types-chambre', icone: '◆', roles: ['Administrateur'] },
  { label: 'Services', path: '/services', icone: '★', roles: ['Administrateur', 'Barman'] },
  { label: 'Vente au bar', path: '/ventes', icone: '🍹', roles: ['Administrateur', 'Barman'] },
  { label: 'Réservations', path: '/reservations', icone: '▤', roles: ['Administrateur', 'Manager', 'Receptionniste'] },
  { label: 'Clients', path: '/clients', icone: '◍', roles: ['Administrateur', 'Manager', 'Receptionniste'] },
  { label: 'Paiements', path: '/paiements', icone: '◈', roles: ['Administrateur', 'Manager', 'Receptionniste', 'Caissier'] },
  { label: 'Caisse', path: '/caisse', icone: '▣', roles: ['Administrateur', 'Caissier', 'Barman'] },
  { label: 'Utilisateurs', path: '/utilisateurs', icone: '◉', roles: ['Administrateur'] },
  { label: 'Paramètres généraux', path: '/parametres', icone: '⚙', roles: ['Administrateur'] },
];
const COULEUR_ETAT = { DISPONIBLE: 'var(--signal)', OCCUPEE: 'var(--danger)', MAINTENANCE: 'var(--warning)', NETTOYAGE: 'var(--info)' };

export default function Layout() {
  const { utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chambres, setChambres] = useState([]);
  const [menuProfilOuvert, setMenuProfilOuvert] = useState(false);
  const estTablette = useIsTablet(); // couvre aussi mobile (< 1024px)
  const [sidebarOuverte, setSidebarOuverte] = useState(false);

  useEffect(() => {
    getChambres().then(setChambres).catch(() => {});
  }, [location.pathname]);

  // Ferme automatiquement le tiroir mobile après chaque navigation
  useEffect(() => {
    setSidebarOuverte(false);
  }, [location.pathname]);

  function handleDeconnexion() {
    deconnexion();
    navigate('/login');
  }

  const menuVisible = MENU.filter((item) => item.roles.some((role) => utilisateur?.roles?.includes(role)));
  const initiales = `${utilisateur?.prenom?.[0] || ''}${utilisateur?.nom?.[0] || ''}`;

  const sidebarContenu = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: 'var(--gradient-signal)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#fff',
        }}>M</div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>Motel du Stade</span>
      </div>

      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--slate-light)', padding: '0 var(--space-3)', marginBottom: 10 }}>MENU PRINCIPAL</p>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
        {menuVisible.map((item) => {
  const actif = location.pathname === item.path;
  return (
    <button
      key={item.path}
      onClick={() => navigate(item.path)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: actif ? 'var(--moss)' : 'transparent',
        color: actif ? '#fff' : 'var(--slate)',
        border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 14px',
        fontSize: 13.5, fontWeight: actif ? 600 : 500, textAlign: 'left', cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => { if (!actif) { e.currentTarget.style.background = 'var(--stone-dim)'; e.currentTarget.style.color = 'var(--ink)'; } }}
      onMouseLeave={(e) => { if (!actif) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--slate)'; } }}
    >
      <span style={{ fontSize: 15, width: 16, textAlign: 'center' }}>{item.icone}</span>
      {item.label}
    </button>
  );
})}
      </nav>

      {chambres.length > 0 && (
        <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-3)', background: 'var(--stone)', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: 'var(--slate-light)', textTransform: 'uppercase', marginBottom: 8 }}>
            Chambres · en direct
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {chambres.map((ch) => (
              <div key={ch.id} title={`N°${ch.numero} — ${ch.etat}`} style={{ aspectRatio: '1', borderRadius: 3, background: COULEUR_ETAT[ch.etat] || 'var(--line-strong)' }} />
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--stone)' }}>
      {/* ---------- Sidebar : fixe en desktop, tiroir en mobile/tablette ---------- */}
      {estTablette ? (
        <>
          {sidebarOuverte && (
            <div onClick={() => setSidebarOuverte(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(30,31,46,0.4)', zIndex: 30 }} />
          )}
          <aside style={{
            position: 'fixed', top: 0, bottom: 0, left: 0, width: 260, zIndex: 31,
            background: 'var(--surface)', borderRight: '1px solid var(--line)',
            display: 'flex', flexDirection: 'column', padding: 'var(--space-6) var(--space-3) var(--space-5)',
            transform: sidebarOuverte ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.2s ease',
          }}>
            {sidebarContenu}
          </aside>
        </>
      ) : (
        <aside style={{
          width: 260, background: 'var(--surface)', borderRight: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column', padding: 'var(--space-6) var(--space-3) var(--space-5)', flexShrink: 0,
        }}>
          {sidebarContenu}
        </aside>
      )}

      {/* ---------- Colonne principale ---------- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface)', borderBottom: '1px solid var(--line)',
          padding: estTablette ? 'var(--space-3) var(--space-4)' : 'var(--space-4) var(--space-6)',
          boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {estTablette && (
              <button
                onClick={() => setSidebarOuverte(true)}
                style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', width: 34, height: 34, fontSize: 16, cursor: 'pointer' }}
                aria-label="Ouvrir le menu"
              >
                ☰
              </button>
            )}
            <h1 style={{ fontSize: estTablette ? 16 : 18 }}>{TITRES_PAGES[location.pathname] || 'Motel du Stade'}</h1>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuProfilOuvert(!menuProfilOuvert)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 'var(--radius-sm)' }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%', background: 'var(--signal-dim-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--signal-dark)',
              }}>
                {initiales}
              </div>
              {!estTablette && (
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{utilisateur?.prenom} {utilisateur?.nom}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--slate)' }}>{utilisateur?.roles?.join(', ')}</p>
                </div>
              )}
            </button>

            {menuProfilOuvert && (
              <>
                <div onClick={() => setMenuProfilOuvert(false)} style={{ position: 'fixed', inset: 0, zIndex: 15 }} />
                <div style={{
                  position: 'absolute', right: 0, top: '110%', width: 200,
                  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)', padding: 6, zIndex: 20,
                }}>
                  <button onClick={() => { setMenuProfilOuvert(false); navigate('/profil'); }} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 10px', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                    Mon profil
                  </button>
                  <button onClick={handleDeconnexion} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 10px', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--danger)', fontWeight: 500 }}>
                    Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: estTablette ? 'var(--space-4)' : 'var(--space-6)', overflowY: 'auto', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}