import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/dashboard.service';
import { getReservations } from '../services/reservation.service';
import { getClients } from '../services/client.service';
import { getChambres } from '../services/chambre.service';
import { getUtilisateurs } from '../services/utilisateur.service';
import { getCaissesUtilisateur, consulterSolde } from '../services/caisse.service';
import Carte from '../components/ui/Carte';
import Button from '../components/ui/Button';
import Alerte from '../components/ui/Alerte';
import StatCard from '../components/ui/StatCard';
import BarreProgression from '../components/ui/BarreProgression';
import Badge, { TON_ETAT_CHAMBRE, TON_STATUT_RESERVATION } from '../components/ui/Badge';

function ListeWidget({ titre, lien, texteLien, enfants, vide }) {
  return (
    <Carte>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h3>{titre}</h3>
        {lien && <Button taille="sm" variante="secondaire" onClick={lien}>{texteLien}</Button>}
      </div>
      {vide ? <p style={{ color: 'var(--slate)', fontSize: 13 }}>Aucune donnée.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{enfants}</div>}
    </Carte>
  );
}

export default function TableauDeBord() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const roles = utilisateur?.roles || [];

  const estAdmin = roles.includes('Administrateur');
  const estManager = roles.includes('Manager');
  const estReceptionniste = roles.includes('Receptionniste');
  const estCaissier = roles.includes('Caissier');
  const estBarman = roles.includes('Barman');

  const voitKPIs = estAdmin || estManager;
  const voitListesOperationnelles = estAdmin || estManager || estReceptionniste;
  const voitCaisse = estAdmin || estCaissier || estBarman;

  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [clients, setClients] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [caisse, setCaisse] = useState(null); // null = pas encore chargé, false = aucune ouverte
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    async function charger() {
      setChargement(true);
      setErreur('');
      const taches = [];

      if (voitKPIs) taches.push(getDashboardStats().then(setStats).catch(() => {}));
      if (voitListesOperationnelles) {
        taches.push(getReservations().then((r) => setReservations(r.slice(0, 5))).catch(() => {}));
        taches.push(getClients().then((c) => setClients(c.slice(0, 5))).catch(() => {}));
        taches.push(getChambres().then(setChambres).catch(() => {}));
      }
      if (estAdmin) {
        taches.push(getUtilisateurs().then((u) => setUtilisateurs(u.slice(0, 5))).catch(() => {}));
      }
      if (voitCaisse) {
        taches.push(
          getCaissesUtilisateur(utilisateur.id)
            .then(async (caisses) => {
              const ouverte = caisses.find((c) => c.ouverte);
              if (!ouverte) return setCaisse(false);
              const solde = await consulterSolde(ouverte.id);
              setCaisse(solde);
            })
            .catch(() => setCaisse(false))
        );
      }

      try {
        await Promise.all(taches);
      } catch (err) {
        setErreur('Certaines données n\'ont pas pu être chargées');
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  if (chargement) return <p style={{ color: 'var(--slate)' }}>Chargement du tableau de bord...</p>;

  const repartitionChambres = ['DISPONIBLE', 'OCCUPEE', 'MAINTENANCE', 'NETTOYAGE'].map((etat) => ({
    etat, total: chambres.filter((c) => c.etat === etat).length,
  }));

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1>Bienvenue, {utilisateur?.prenom}</h1>
        <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {erreur && <div style={{ marginBottom: 'var(--space-5)' }}><Alerte variante="erreur">{erreur}</Alerte></div>}

      {/* ---------- Caisse actuelle (Caissier / Barman / Administrateur) ---------- */}
      {voitCaisse && (
        <Carte style={{ marginBottom: 'var(--space-5)', borderColor: caisse ? 'var(--signal)' : 'var(--line)' }}>
          {caisse ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0 }}>Votre caisse est ouverte</p>
                <p className="mono" style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 0', color: 'var(--signal-dark)' }}>{caisse.soldeCourant}</p>
              </div>
              <Button variante="secondaire" onClick={() => navigate('/caisse')}>Gérer la caisse</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <p style={{ color: 'var(--slate)', fontSize: 13, margin: 0 }}>Aucune caisse ouverte pour le moment.</p>
              <Button onClick={() => navigate('/caisse')}>Ouvrir la caisse</Button>
            </div>
          )}
        </Carte>
      )}

      {/* ---------- Raccourci Bar pour le Barman ---------- */}
      {estBarman && !estAdmin && (
        <Carte style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>Point de vente</h3>
              <p style={{ color: 'var(--slate)', fontSize: 13, margin: 0 }}>Enregistrer une nouvelle vente au bar/restaurant.</p>
            </div>
            <Button onClick={() => navigate('/ventes')}>Ouvrir le point de vente</Button>
          </div>
        </Carte>
      )}

      {/* ---------- KPIs (Manager / Administrateur) ---------- */}
      {voitKPIs && stats && (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
            <StatCard icone="◈" valeur={`${stats.tauxOccupation}%`} label="Taux d'occupation" />
            <StatCard icone="◆" valeur={stats.revenusDuJour} label="Revenus du jour" />
            <StatCard icone="▤" valeur={stats.reservationsDuJour} label="Réservations du jour" />
            <StatCard icone="✦" valeur={stats.nouvellesReservations} label="Nouvelles réservations" />
          </div>

          <Carte style={{ marginBottom: 'var(--space-5)' }}>
            <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8 }}>Occupation du parc de chambres</p>
            <BarreProgression pourcentage={stats.tauxOccupation} />
          </Carte>
        </>
      )}

      {/* ---------- Listes opérationnelles (Admin / Manager / Réceptionniste) ---------- */}
      {voitListesOperationnelles && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }} className="grille-2col">
          <ListeWidget
            titre="Réservations récentes"
            lien={() => navigate('/reservations')}
            texteLien="Voir tout"
            vide={reservations.length === 0}
            enfants={reservations.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span>{r.client ? `${r.client.prenom || ''} ${r.client.nom || ''}`.trim() || 'Client' : 'Client supprimé'} — Ch. {r.chambre?.numero ?? '—'}</span>
                <Badge label={r.statut} ton={TON_STATUT_RESERVATION[r.statut]} />
              </div>
            ))}
          />

          <ListeWidget
            titre="Clients récents"
            lien={() => navigate('/clients')}
            texteLien="Voir tout"
            vide={clients.length === 0}
            enfants={clients.map((c) => (
              <div key={c.id} style={{ fontSize: 13 }}>
                {[c.prenom, c.nom].filter(Boolean).join(' ') || '(sans nom)'}{' '}
                <span style={{ color: 'var(--slate)' }}>— {c.email || c.telephone}</span>
              </div>
            ))}
          />

          <ListeWidget
            titre="État des chambres"
            lien={() => navigate('/chambres')}
            texteLien="Voir tout"
            vide={chambres.length === 0}
            enfants={repartitionChambres.map(({ etat, total }) => (
              <div key={etat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <Badge label={etat} ton={TON_ETAT_CHAMBRE[etat]} />
                <span className="mono" style={{ fontWeight: 500 }}>{total}</span>
              </div>
            ))}
          />

          {estAdmin && (
            <ListeWidget
              titre="Utilisateurs"
              lien={() => navigate('/utilisateurs')}
              texteLien="Voir tout"
              vide={utilisateurs.length === 0}
              enfants={utilisateurs.map((u) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{u.prenom} {u.nom}</span>
                  <span style={{ color: 'var(--slate)' }}>{u.roles.map((r) => r.libelle).join(', ')}</span>
                </div>
              ))}
            />
          )}
        </div>
      )}

      {!voitKPIs && !voitListesOperationnelles && !voitCaisse && (
        <p style={{ color: 'var(--slate)' }}>Utilisez le menu à gauche pour accéder aux différents modules.</p>
      )}
    </div>
  );
}