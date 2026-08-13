import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getCaissesUtilisateur, ouvrirCaisse, enregistrerMouvement, consulterSolde, fermerCaisse,
} from '../services/caisse.service';
import Button from '../components/ui/Button';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import ModalConfirmation from '../components/ui/ModalConfirmation';

export default function Caisse() {
  const { utilisateur } = useAuth();

  const [caisseActive, setCaisseActive] = useState(null);
  const [solde, setSolde] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [modalOuvertureOuverte, setModalOuvertureOuverte] = useState(false);
  const [soldeInitial, setSoldeInitial] = useState('');
  const [ouvertureEnCours, setOuvertureEnCours] = useState(false);

  const [modalMouvementOuverte, setModalMouvementOuverte] = useState(false);
  const [typeMouvement, setTypeMouvement] = useState('ENTREE');
  const [montantMouvement, setMontantMouvement] = useState('');
  const [motifMouvement, setMotifMouvement] = useState('');
  const [mouvementEnCours, setMouvementEnCours] = useState(false);
  const [erreurMouvement, setErreurMouvement] = useState('');

  const [confirmationFermetureOuverte, setConfirmationFermetureOuverte] = useState(false);
  const [fermetureEnCours, setFermetureEnCours] = useState(false);
  const [modalRapportOuverte, setModalRapportOuverte] = useState(false);
  const [rapportFermeture, setRapportFermeture] = useState(null);

  useEffect(() => { verifierCaisseOuverte(); }, []);

  async function verifierCaisseOuverte() {
    try {
      setChargement(true);
      const caisses = await getCaissesUtilisateur(utilisateur.id);
      const ouverte = caisses.find((c) => c.ouverte);
      if (ouverte) {
        setCaisseActive(ouverte);
        await rafraichirSolde(ouverte.id);
      } else {
        setCaisseActive(null);
      }
    } catch (err) {
      setErreur('Impossible de vérifier l\'état de la caisse');
    } finally {
      setChargement(false);
    }
  }

  async function rafraichirSolde(caisseId) {
    setSolde(await consulterSolde(caisseId));
    const caisses = await getCaissesUtilisateur(utilisateur.id);
    setHistorique(caisses.find((c) => c.id === caisseId)?.mouvements || []);
  }

  async function handleOuvrir(e) {
    e.preventDefault();
    setErreur('');
    setOuvertureEnCours(true);
    try {
      const nouvelleCaisse = await ouvrirCaisse(utilisateur.id, Number(soldeInitial));
      setCaisseActive(nouvelleCaisse);
      setSoldeInitial('');
      setModalOuvertureOuverte(false);
      await rafraichirSolde(nouvelleCaisse.id);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de l\'ouverture');
    } finally {
      setOuvertureEnCours(false);
    }
  }

  async function handleEnregistrerMouvement(e) {
    e.preventDefault();
    setErreurMouvement('');
    setMouvementEnCours(true);
    try {
      await enregistrerMouvement(caisseActive.id, { type: typeMouvement, montant: Number(montantMouvement), motif: motifMouvement });
      setMontantMouvement(''); setMotifMouvement(''); setModalMouvementOuverte(false);
      await rafraichirSolde(caisseActive.id);
    } catch (err) {
      setErreurMouvement(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setMouvementEnCours(false);
    }
  }

  async function handleConfirmerFermeture() {
    setFermetureEnCours(true);
    try {
      const resultat = await fermerCaisse(caisseActive.id);
      setRapportFermeture(resultat.rapport);
      setConfirmationFermetureOuverte(false);
      setModalRapportOuverte(true);
      setCaisseActive(null);
      setSolde(null);
      setHistorique([]);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la fermeture');
      setConfirmationFermetureOuverte(false);
    } finally {
      setFermetureEnCours(false);
    }
  }

  if (chargement) return <p style={{ color: 'var(--slate)' }}>Chargement...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-5)' }}>Caisse</h1>

        {erreur && <Alerte variante="erreur">{erreur}</Alerte>}
       

      {!caisseActive && (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)', marginBottom: 'var(--space-4)' }}>Aucune caisse ouverte pour le moment.</p>
          <Button onClick={() => setModalOuvertureOuverte(true)} style={{ margin: '0 auto' }}>Ouvrir la caisse</Button>
        </Carte>
      )}

      {caisseActive && solde && (
        <div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <Carte style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0 }}>Solde initial</p>
              <p className="mono" style={{ fontSize: 24, fontWeight: 600, margin: '4px 0 0' }}>{solde.soldeInitial}</p>
            </Carte>
            <Carte style={{ flex: 1, borderColor: 'var(--signal)' }}>
              <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0 }}>Solde courant</p>
              <p className="mono" style={{ fontSize: 24, fontWeight: 600, margin: '4px 0 0', color: 'var(--moss)' }}>{solde.soldeCourant}</p>
            </Carte>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
              <Button onClick={() => setModalMouvementOuverte(true)}>+ Mouvement</Button>
              <Button variante="danger" onClick={() => setConfirmationFermetureOuverte(true)}>Fermer la caisse</Button>
            </div>
          </div>

          <h3 style={{ marginBottom: 'var(--space-3)' }}>Historique des mouvements</h3>
          {historique.length === 0 ? (
            <Carte style={{ textAlign: 'center', padding: 'var(--space-6)' }}><p style={{ color: 'var(--slate)' }}>Aucun mouvement enregistré.</p></Carte>
          ) : (
            <Carte padding="0">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    {['Date', 'Type', 'Montant', 'Motif'].map((h) => (
                      <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historique.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{new Date(m.dateMouvement).toLocaleString('fr-FR')}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500, color: m.type === 'ENTREE' ? 'var(--success)' : 'var(--danger)' }}>
                        {m.type === 'ENTREE' ? '↑ Entrée' : '↓ Sortie'}
                      </td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500 }}>{m.montant}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{m.motif || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Carte>
          )}
        </div>
      )}

      {/* ---------- Modal ouverture ---------- */}
      <Modal ouvert={modalOuvertureOuverte} onFermer={() => setModalOuvertureOuverte(false)} titre="Ouvrir la caisse" largeur={380}>
        <form onSubmit={handleOuvrir} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Champ label="Solde initial (fond de caisse)">
            <input type="number" step="0.01" value={soldeInitial} onChange={(e) => setSoldeInitial(e.target.value)} required style={styleInput} autoFocus />
          </Champ>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={() => setModalOuvertureOuverte(false)}>Annuler</Button>
            <Button type="submit" enCours={ouvertureEnCours}>Ouvrir</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Modal mouvement ---------- */}
      <Modal ouvert={modalMouvementOuverte} onFermer={() => setModalMouvementOuverte(false)} titre="Nouveau mouvement" largeur={380}>
        <form onSubmit={handleEnregistrerMouvement} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setTypeMouvement('ENTREE')} style={{
              flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              border: `1px solid ${typeMouvement === 'ENTREE' ? 'var(--success)' : 'var(--line)'}`,
              background: typeMouvement === 'ENTREE' ? 'var(--success-bg)' : 'transparent',
              color: typeMouvement === 'ENTREE' ? 'var(--success)' : 'var(--slate)', fontWeight: 500, fontSize: 13,
            }}>↑ Entrée</button>
            <button type="button" onClick={() => setTypeMouvement('SORTIE')} style={{
              flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              border: `1px solid ${typeMouvement === 'SORTIE' ? 'var(--danger)' : 'var(--line)'}`,
              background: typeMouvement === 'SORTIE' ? 'var(--danger-bg)' : 'transparent',
              color: typeMouvement === 'SORTIE' ? 'var(--danger)' : 'var(--slate)', fontWeight: 500, fontSize: 13,
            }}>↓ Sortie</button>
          </div>

          <Champ label="Montant"><input type="number" step="0.01" value={montantMouvement} onChange={(e) => setMontantMouvement(e.target.value)} required style={styleInput} /></Champ>
          <Champ label="Motif"><input value={motifMouvement} onChange={(e) => setMotifMouvement(e.target.value)} placeholder="ex: Paiement chambre 101" style={styleInput} /></Champ>

          {erreurMouvement && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{erreurMouvement}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={() => setModalMouvementOuverte(false)}>Annuler</Button>
            <Button type="submit" enCours={mouvementEnCours}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Confirmation de fermeture ---------- */}
      <ModalConfirmation
        ouvert={confirmationFermetureOuverte}
        onFermer={() => setConfirmationFermetureOuverte(false)}
        onConfirmer={handleConfirmerFermeture}
        titre="Fermer la caisse"
        message="Cette action est définitive. Le rapport de clôture sera généré et la caisse ne pourra plus recevoir de mouvements."
        texteConfirmer="Fermer la caisse"
        enCours={fermetureEnCours}
      />

      {/* ---------- Rapport de fermeture ---------- */}
      <Modal ouvert={modalRapportOuverte} onFermer={() => setModalRapportOuverte(false)} titre="Rapport de fermeture" largeur={420}>
        {rapportFermeture && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Caissier', rapportFermeture.caissier],
              ['Ouverture', new Date(rapportFermeture.dateOuverture).toLocaleString('fr-FR')],
              ['Fermeture', new Date(rapportFermeture.dateFermeture).toLocaleString('fr-FR')],
              ['Solde initial', rapportFermeture.soldeInitial],
              ['Total entrées', rapportFermeture.totalEntrees],
              ['Total sorties', rapportFermeture.totalSorties],
            ].map(([label, valeur]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--slate)' }}>{label}</span>
                <span className="mono">{valeur}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--line)', fontSize: 15, fontWeight: 600 }}>
              <span>Solde final</span>
              <span className="mono" style={{ color: 'var(--moss)' }}>{rapportFermeture.soldeFinal}</span>
            </div>
            <Button onClick={() => setModalRapportOuverte(false)} style={{ marginTop: 'var(--space-2)', width: '100%', justifyContent: 'center' }}>
              Fermer ce rapport
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}