import { useState, useEffect, useCallback } from 'react';
import { getJournal, getFiltresJournal } from '../services/recette.service';
import SelecteurPeriode, { bornesPeriode } from '../components/SelecteurPeriode';
import Carte from '../components/ui/Carte';
import Button from '../components/ui/Button';
import Alerte from '../components/ui/Alerte';
import { styleInput } from '../components/ui/Champ';

// Chaque action porte un ton : on repère d'un coup d'œil ce qui touche à l'argent
// et ce qui supprime quelque chose.
const TON_ACTION = (action) => {
  if (/ANNUL|SUPPRIM|ARCHIVE|EXPIREE|REMBOURS/.test(action)) return 'var(--danger)';
  if (/PAIEMENT|CAISSE|VENTE|ARRIVEE/.test(action)) return 'var(--moss)';
  if (/CREE|AJOUT|CONFIRM|REACTIVE/.test(action)) return 'var(--info)';
  return 'var(--slate)';
};

const lisible = (valeur) => valeur.replace(/_/g, ' ').toLowerCase();

export default function Historique() {
  const [periode, setPeriode] = useState(() => ({ cle: 'semaine', ...bornesPeriode('semaine') }));
  const [filtres, setFiltres] = useState({ actions: [], cibles: [], auteurs: [] });
  const [action, setAction] = useState('');
  const [utilisateurId, setUtilisateurId] = useState('');
  const [operations, setOperations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => { getFiltresJournal().then(setFiltres).catch(() => {}); }, []);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      setOperations(await getJournal({
        debut: periode.debut.toISOString(),
        fin: periode.fin.toISOString(),
        ...(action && { action }),
        ...(utilisateurId && { utilisateurId }),
      }));
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de charger l\'historique');
    } finally {
      setChargement(false);
    }
  }, [periode, action, utilisateurId]);

  useEffect(() => { charger(); }, [charger]);

  return (
    <div>
      <div className="sans-impression" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1>Historique des opérations</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>
            Qui a fait quoi, et quand. {operations.length} opération{operations.length > 1 ? 's' : ''} sur la période.
          </p>
        </div>
        <Button variante="secondaire" onClick={() => window.print()}>Imprimer</Button>
      </div>

      <div className="sans-impression">
        <SelecteurPeriode valeur={periode.cle} onChanger={setPeriode} />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
          <select value={action} onChange={(e) => setAction(e.target.value)} style={{ ...styleInput, height: 34, fontSize: 12.5, width: 220 }}>
            <option value="">Toutes les opérations</option>
            {filtres.actions.map((a) => <option key={a} value={a}>{lisible(a)}</option>)}
          </select>
          <select value={utilisateurId} onChange={(e) => setUtilisateurId(e.target.value)} style={{ ...styleInput, height: 34, fontSize: 12.5, width: 200 }}>
            <option value="">Tout le personnel</option>
            {filtres.auteurs.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
          </select>
        </div>
      </div>

      {erreur && <Alerte variante="erreur">{erreur}</Alerte>}

      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : operations.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>Aucune opération sur cette période.</p>
        </Carte>
      ) : (
        <Carte padding="0">
          {operations.map((o) => (
            <div key={o.id} style={{
              display: 'flex', gap: 14, alignItems: 'baseline',
              padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--line)',
            }}>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--slate-light)', whiteSpace: 'nowrap', minWidth: 118 }}>
                {new Date(o.dateOperation).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{
                fontSize: 10.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                color: TON_ACTION(o.action), whiteSpace: 'nowrap', minWidth: 150, fontWeight: 600,
              }}>
                {lisible(o.action)}
              </span>
              <span style={{ fontSize: 13.5, flex: 1, color: 'var(--ink)' }}>{o.resume}</span>
              <span style={{ fontSize: 12, color: 'var(--slate)', whiteSpace: 'nowrap' }}>
                {o.auteurNom || 'Système'}
              </span>
            </div>
          ))}
        </Carte>
      )}
    </div>
  );
}
