import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReservations } from '../services/reservation.service';
import Button from '../components/ui/Button';
import Alerte from '../components/ui/Alerte';
import Champ, { styleInput } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import Badge, { TON_STATUT_RESERVATION } from '../components/ui/Badge';
import { getPaiements, enregistrerPaiement, rembourserPaiement, telechargerFacture } from '../services/paiement.service';
import LigneTableau from '../components/ui/LigneTableau';

const MODES_PAIEMENT = ['ESPECES', 'CARTE', 'VIREMENT', 'MOBILE_MONEY'];

const LIBELLE_STATUT = {
  EN_ATTENTE: 'À confirmer',
  CONFIRMEE: 'Attendue',
  EN_COURS: 'Sur place',
  TERMINEE: 'Terminée',
};

// L'écran répondait « quels paiements ai-je encaissés ? ». La question du comptoir
// est l'inverse : « qui me doit encore quelque chose ? ». Ces filtres rangent les
// clients par état de règlement, comme les onglets de l'écran Réservations.
const FILTRES_SOLDE = [
  { cle: 'TOUTES', label: 'Toutes', test: () => true,
    vide: 'Aucune réservation à suivre.' },
  { cle: 'A_ENCAISSER', label: 'À encaisser', test: (r) => r.resteAPayer > 0,
    vide: 'Tout est encaissé : aucun client ne doit d\'argent.' },
  { cle: 'SOLDEES', label: 'Soldées', test: (r) => r.resteAPayer === 0,
    vide: 'Aucune réservation entièrement réglée.' },
];

export default function Paiements() {
  const [params, setParams] = useSearchParams();
  const [paiements, setPaiements] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [telechargementEnCours, setTelechargementEnCours] = useState(null); // id du paiement en cours de téléchargement
  // Comme sur l'écran Réservations : on arrive sur le premier filtre, « Toutes ».
  const [filtre, setFiltre] = useState(FILTRES_SOLDE[0].cle);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);

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
      // Annulée ou non venue : rien n'est dû, ces lignes gonfleraient le total à
      // encaisser. Tout le reste est suivi, y compris les séjours terminés — un
      // client parti avec un impayé doit rester encaissable, ce que l'ancienne
      // liste interdisait en écartant les réservations terminées.
      setReservations(reservationsData.filter((r) => !['ANNULEE', 'EXPIREE'].includes(r.statut)));
    } catch (err) {
      setErreur('Impossible de charger les paiements');
    } finally {
      setChargement(false);
    }
  }

  // Arrivée depuis le bouton « Régler » d'une réservation : la caisse s'ouvre
  // directement sur ce client, sans le faire rechercher dans une liste.
  useEffect(() => {
    const cible = params.get('reservation');
    if (!cible || chargement) return;
    const resa = reservations.find((r) => r.id === Number(cible));
    if (resa) ouvrirPaiement(resa);
    setParams({}, { replace: true });
  }, [chargement, params, reservations]);

  function ouvrirPaiement(resa) {
    setReservationId(String(resa.id));
    // Le montant proposé est ce qu'il reste dû : le cas courant est le solde,
    // et le réceptionniste corrige à la baisse pour un acompte.
    setMontant(resa.resteAPayer > 0 ? String(resa.resteAPayer) : '');
    setModePaiement('ESPECES');
    setReference('');
    setErreurFormulaire('');
    setModalOuverte(true);
  }

  function fermerModal() {
    setModalOuverte(false);
    setReservationId(''); setMontant(''); setModePaiement('ESPECES'); setReference(''); setErreurFormulaire('');
  }

  function handleChangerReservation(valeur) {
    setReservationId(valeur);
    const resa = reservations.find((r) => r.id === Number(valeur));
    setMontant(resa && resa.resteAPayer > 0 ? String(resa.resteAPayer) : '');
  }

  async function handleEnregistrer(e) {
    e.preventDefault();
    setErreurFormulaire('');
    setEnregistrementEnCours(true);
    try {
      await enregistrerPaiement({ reservationId: Number(reservationId), montant: Number(montant), modePaiement, reference });
      const restant = Math.max(0, (reservationChoisie?.resteAPayer || 0) - Number(montant));
      fermerModal();
      setSucces(restant > 0
        ? `Paiement de ${Number(montant)} enregistré. Il reste ${Math.round(restant * 100) / 100} à encaisser.`
        : `Paiement de ${Number(montant)} enregistré. La réservation est soldée.`);
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
  const filtreActif = FILTRES_SOLDE.find((f) => f.cle === filtre);
  const reservationsAffichees = reservations.filter(filtreActif.test);
  const totalAEncaisser = reservations.reduce((s, r) => s + r.resteAPayer, 0);
  const nombreAEncaisser = reservations.filter((r) => r.resteAPayer > 0).length;

  // Ce qu'il restera dû une fois ce paiement saisi : le réceptionniste voit
  // l'effet de son encaissement avant de valider, pas après.
  const resteApresPaiement = reservationChoisie
    ? Math.round((reservationChoisie.resteAPayer - (Number(montant) || 0)) * 100) / 100
    : null;

  const nomClient = (client) => (client ? `${client.prenom || ''} ${client.nom || ''}`.trim() || client.telephone : 'Client supprimé');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1>Paiements</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>
            {nombreAEncaisser > 0
              ? <>{nombreAEncaisser} client{nombreAEncaisser > 1 ? 's' : ''} à encaisser · <strong className="mono" style={{ color: 'var(--danger)' }}>{Math.round(totalAEncaisser * 100) / 100}</strong> en attente</>
              : 'Tout est encaissé.'}
          </p>
        </div>
        <Button onClick={() => setModalOuverte(true)}>+ Nouveau paiement</Button>
      </div>

      {erreur && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="erreur">{erreur}</Alerte></div>}
      {succes && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="succes">{succes}</Alerte></div>}

      {/* ---------- Filtres par état de règlement ---------- */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        {FILTRES_SOLDE.map(({ cle, label, test }) => {
          const nombre = reservations.filter(test).length;
          const actif = filtre === cle;
          return (
            <button
              key={cle}
              onClick={() => setFiltre(cle)}
              style={{
                background: actif ? 'var(--moss)' : 'var(--surface)',
                color: actif ? '#fff' : 'var(--slate)',
                border: `1px solid ${actif ? 'var(--moss)' : 'var(--line)'}`,
                borderRadius: 'var(--radius-sm)', padding: '8px 14px',
                fontSize: 13, fontWeight: actif ? 600 : 500, cursor: 'pointer',
              }}
            >
              {label} <span className="mono" style={{ opacity: 0.7 }}>{nombre}</span>
            </button>
          );
        })}
      </div>

      {/* ---------- Situation des clients ---------- */}
      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : reservationsAffichees.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>{filtreActif.vide}</p>
        </Carte>
      ) : (
        <Carte padding="0">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  {['Client', 'Chambre', 'Séjour', 'Total dû', 'Déjà payé', 'Reste à payer', ''].map((h) => (
                    <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservationsAffichees.map((r) => (
                  <LigneTableau key={r.id}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {nomClient(r.client)}
                    </td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13 }}>
                      {r.chambre ? `N°${r.chambre.numero}` : '-'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Badge label={LIBELLE_STATUT[r.statut] || r.statut} ton={TON_STATUT_RESERVATION[r.statut]} />
                    </td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {r.totalDu}
                      {r.montantConsommations > 0 && (
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--slate)' }}>
                          dont {r.montantConsommations} de consommations
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{r.montantPaye}</td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {r.resteAPayer > 0
                        ? <span style={{ color: 'var(--danger)' }}>{r.resteAPayer}</span>
                        : <span style={{ color: 'var(--success)' }}>soldé</span>}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      {r.resteAPayer > 0 && (
                        <Button taille="sm" onClick={() => ouvrirPaiement(r)}>Régler</Button>
                      )}
                    </td>
                  </LigneTableau>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>
      )}

      {/* ---------- Historique des encaissements ---------- */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <button
          onClick={() => setHistoriqueOuvert(!historiqueOuvert)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, marginBottom: 'var(--space-3)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--slate)' }}>{historiqueOuvert ? '▾' : '▸'}</span>
          Historique des encaissements
          <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: 'var(--slate)' }}>{paiements.length}</span>
        </button>

        {historiqueOuvert && (paiements.length === 0 ? (
          <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--slate)' }}>Aucun paiement enregistré.</p>
          </Carte>
        ) : (
          <Carte padding="0">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    {['Client', 'Date', 'Montant', 'Mode', 'Facture', 'Réservation', 'Statut', ''].map((h) => (
                      <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paiements.map((p) => (
                    <LigneTableau key={p.id}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {nomClient(p.reservation?.client)}
                      </td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500 }}>{p.montant}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5 }}><Badge label={p.modePaiement} ton="neutre" /></td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--slate)' }}>{p.facture?.numeroFacture || '-'}</td>
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
                    </LigneTableau>
                  ))}
                </tbody>
              </table>
            </div>
          </Carte>
        ))}
      </div>

      {/* ---------- Modal d'encaissement ---------- */}
      <Modal ouvert={modalOuverte} onFermer={fermerModal} titre="Encaisser un paiement" largeur={520}>
        <form onSubmit={handleEnregistrer} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Champ label="Réservation">
            <select value={reservationId} onChange={(e) => handleChangerReservation(e.target.value)} required style={styleInput}>
              <option value="">-- Choisir --</option>
              {reservations.map((r) => (
                <option key={r.id} value={r.id}>
                  {nomClient(r.client)} · Chambre {r.chambre?.numero} · {r.resteAPayer > 0 ? `reste ${r.resteAPayer}` : 'soldé'}
                </option>
              ))}
            </select>
          </Champ>

          {/* Le détail de la note : sans lui, le réceptionniste saisissait un montant
              sans savoir ce que le client devait réellement. */}
          {reservationChoisie && (
            <div style={{ background: 'var(--stone)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)', fontSize: 13 }}>
              {[
                ['Chambre et prolongations', reservationChoisie.montantTotal],
                ...(reservationChoisie.montantConsommations > 0 ? [['Consommations', reservationChoisie.montantConsommations]] : []),
                ['Total dû', reservationChoisie.totalDu],
                ['Déjà payé', reservationChoisie.montantPaye],
              ].map(([label, valeur]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--slate)' }}>{label}</span>
                  <span className="mono">{valeur}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontWeight: 700,
                paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--line)',
                color: reservationChoisie.resteAPayer > 0 ? 'var(--danger)' : 'var(--success)',
              }}>
                <span>Reste à payer</span>
                <span className="mono">{reservationChoisie.resteAPayer > 0 ? reservationChoisie.resteAPayer : 'soldé'}</span>
              </div>
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

          {/* Effet du montant saisi, avant validation */}
          {reservationChoisie && Number(montant) > 0 && (
            <p style={{
              margin: 0, fontSize: 13, fontWeight: 500,
              padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
              color: resteApresPaiement > 0 ? 'var(--warning)' : 'var(--success)',
              background: resteApresPaiement > 0 ? 'var(--warning-bg)' : 'var(--success-bg)',
            }}>
              {resteApresPaiement > 0
                ? `Paiement partiel : il restera ${resteApresPaiement} à encaisser.`
                : resteApresPaiement < 0
                  ? `Le client verse ${Math.abs(resteApresPaiement)} de plus que ce qu'il doit.`
                  : 'Ce paiement solde la réservation.'}
            </p>
          )}

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
              {' '}{nomClient(paiementARembourser.reservation?.client)}.
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
