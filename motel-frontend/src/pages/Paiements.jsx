import { useState, useEffect } from 'react';
import { getReservations } from '../services/reservation.service';
import Button from '../components/ui/Button';
import Champ, { styleInput } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { getPaiements, enregistrerPaiement, rembourserPaiement, telechargerFacture } from '../services/paiement.service';
import LigneTableau from '../components/ui/LigneTableau';

const MODES_PAIEMENT = ['ESPECES', 'CARTE', 'VIREMENT', 'MOBILE_MONEY'];

export default function Paiements() {
  const [paiements, setPaiements] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [telechargementEnCours, setTelechargementEnCours] = useState(null); // id du paiement en cours de téléchargement
  const [modalOuverte, setModalOuverte] = useState(false);
  const [reservationId, setReservationId] = useState('');
  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState('ESPECES');
  const [reference, setReference] = useState('');
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');

  const [paiementARembourser, setPaiementARembourser] = useState(null);
  const [annulerReservationAussi, setAnnulerReservationAussi] = useState(false);
  const [remboursementEnCours, setRemboursementEnCours] = useState(false);

  useEffect(() => { chargerDonnees(); }, []);

  async function chargerDonnees() {
    try {
      setChargement(true);
      const [paiementsData, reservationsData] = await Promise.all([getPaiements(), getReservations()]);
      setPaiements(paiementsData);
      setReservations(reservationsData.filter((r) => r.statut !== 'ANNULEE' && r.statut !== 'TERMINEE'));
    } catch (err) {
      setErreur('Impossible de charger les paiements');
    } finally {
      setChargement(false);
    }
  }

  function fermerModal() {
    setModalOuverte(false);
    setReservationId(''); setMontant(''); setModePaiement('ESPECES'); setReference(''); setErreurFormulaire('');
  }

  async function handleEnregistrer(e) {
    e.preventDefault();
    setErreurFormulaire('');
    setEnregistrementEnCours(true);
    try {
      await enregistrerPaiement({ reservationId: Number(reservationId), montant: Number(montant), modePaiement, reference });
      fermerModal();
      setSucces('Paiement enregistré et facture générée.');
      await chargerDonnees();
    } catch (err) {
      setErreurFormulaire(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setEnregistrementEnCours(false);
    }
  }

  function ouvrirModalRemboursement(paiement) {
    setPaiementARembourser(paiement);
    setAnnulerReservationAussi(false);
  }

  async function handleConfirmerRemboursement() {
    setRemboursementEnCours(true);
    try {
      await rembourserPaiement(paiementARembourser.id, annulerReservationAussi);
      setSucces('Remboursement effectué.');
      setPaiementARembourser(null);
      await chargerDonnees();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors du remboursement');
      setPaiementARembourser(null);
    } finally {
      setRemboursementEnCours(false);
    }
  }
  async function handleTelechargerFacture(paiement) {
  setTelechargementEnCours(paiement.id);
  try {
    await telechargerFacture(paiement.id, paiement.facture?.numeroFacture);
  } catch (err) {
    setErreur('Impossible de télécharger la facture');
  } finally {
    setTelechargementEnCours(null);
  }
}

  const reservationChoisie = reservations.find((r) => r.id === Number(reservationId));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1>Paiements</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>{paiements.length} paiement{paiements.length > 1 ? 's' : ''} enregistré{paiements.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setModalOuverte(true)}>+ Nouveau paiement</Button>
      </div>

        {erreur && <Alerte variante="erreur">{erreur}</Alerte>}
     

      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : paiements.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}><p style={{ color: 'var(--slate)' }}>Aucun paiement enregistré.</p></Carte>
      ) : (
        <Carte padding="0">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                {['Client', 'Date', 'Montant', 'Mode', 'Facture', 'Réservation', 'Statut', ''].map((h) => (
                  <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paiements.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13.5, fontWeight: 500 }}>
                    {p.reservation?.client ? `${p.reservation.client.prenom} ${p.reservation.client.nom}` : 'Client supprimé'}
                  </td>
                  <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                  <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500 }}>{p.montant}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5 }}><Badge label={p.modePaiement} ton="neutre" /></td>
                  <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--slate)' }}>{p.facture?.numeroFacture || '—'}</td>
                  <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>#{p.reservationId}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge label={p.rembourse ? 'Remboursé' : 'Actif'} ton={p.rembourse ? 'danger' : 'succes'} />
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <Button
                        variante="secondaire"
                        taille="sm"
                        onClick={() => handleTelechargerFacture(p)}
                        enCours={telechargementEnCours === p.id}
                        disabled={!p.facture}
                      >
                        Facture PDF
                      </Button>
                      {!p.rembourse && <Button variante="secondaire" taille="sm" onClick={() => ouvrirModalRemboursement(p)}>Rembourser</Button>}
                    </div>
                  </td>
                
                </tr>
              ))}
            </tbody>
          </table>
        </Carte>
      )}

      {/* ---------- Modal de création ---------- */}
      <Modal ouvert={modalOuverte} onFermer={fermerModal} titre="Nouveau paiement">
        <form onSubmit={handleEnregistrer} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Champ label="Réservation">
            <select value={reservationId} onChange={(e) => setReservationId(e.target.value)} required style={styleInput}>
              <option value="">-- Choisir --</option>
              {reservations.map((r) => (
                <option key={r.id} value={r.id}>#{r.id} — {r.client.prenom} {r.client.nom} — Chambre {r.chambre.numero}</option>
              ))}
            </select>
          </Champ>

          {reservationChoisie && (
            <div style={{ background: 'var(--signal-dim)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--moss)' }}>Montant total dû</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--moss)' }}>{reservationChoisie.montantTotal}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Champ label="Montant payé">
              <input type="number" step="0.01" value={montant} onChange={(e) => setMontant(e.target.value)} required style={styleInput} />
            </Champ>
            <Champ label="Mode de paiement">
              <select value={modePaiement} onChange={(e) => setModePaiement(e.target.value)} style={styleInput}>
                {MODES_PAIEMENT.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </Champ>
          </div>

          <Champ label="Référence (optionnel)">
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="ex: OM-12345" style={styleInput} />
          </Champ>

          {erreurFormulaire && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{erreurFormulaire}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={fermerModal}>Annuler</Button>
            <Button type="submit" enCours={enregistrementEnCours}>Enregistrer le paiement</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Modal de remboursement avec choix ---------- */}
      <Modal ouvert={!!paiementARembourser} onFermer={() => setPaiementARembourser(null)} titre="Rembourser le paiement" largeur={420}>
        {paiementARembourser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ color: 'var(--slate)', fontSize: 13.5, margin: 0 }}>
            Rembourser le paiement de <strong className="mono" style={{ color: 'var(--ink)' }}>{paiementARembourser.montant}</strong> pour
            {' '}{paiementARembourser.reservation?.client ? `${paiementARembourser.reservation.client.prenom} ${paiementARembourser.reservation.client.nom}` : 'un client supprimé'}.
          </p>

            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: 'var(--space-3)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', background: annulerReservationAussi ? 'var(--danger-bg)' : 'transparent',
            }}>
              <input
                type="checkbox"
                checked={annulerReservationAussi}
                onChange={(e) => setAnnulerReservationAussi(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span style={{ fontSize: 13 }}>
                <strong>Annuler aussi la réservation</strong>
                <br />
                <span style={{ color: 'var(--slate)' }}>Le statut passera à "Annulée" et la chambre redeviendra disponible.</span>
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variante="secondaire" onClick={() => setPaiementARembourser(null)}>Annuler</Button>
              <Button variante="danger" onClick={handleConfirmerRemboursement} enCours={remboursementEnCours}>
                Confirmer le remboursement
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}