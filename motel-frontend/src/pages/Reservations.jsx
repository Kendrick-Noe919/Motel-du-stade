import { useState, useEffect } from 'react';
import {
  getReservations, consulterDisponibilites, creerReservation, annulerReservation,
  modifierReservation, supprimerReservation, viderReservationsAnnulees,
} from '../services/reservation.service';
import { getClients } from '../services/client.service';
import { getServices } from '../services/service.service';
import {
  checkIn, checkOut, getSejourParReservation, ajouterConsommation,
  supprimerConsommation, ajouterHeuresSupplementaires,
} from '../services/sejour.service';
import Button from '../components/ui/Button';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import ModalConfirmation from '../components/ui/ModalConfirmation';
import Alerte from '../components/ui/Alerte';
import Badge, { TON_STATUT_RESERVATION } from '../components/ui/Badge';

const CATEGORIES_BAR = ['RESTAURANT', 'MINIBAR'];

function aujourdHui() {
  return new Date().toISOString().slice(0, 10);
}

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  // ---------- Création (2 étapes) ----------
  const [modalOuverte, setModalOuverte] = useState(false);
  const [dateArrivee, setDateArrivee] = useState('');
  const [dateDepart, setDateDepart] = useState('');
  const [modeTarification, setModeTarification] = useState('NUITEE');
  const [nombreHeures, setNombreHeures] = useState('1');
  const [chambresDisponibles, setChambresDisponibles] = useState(null);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const [clientId, setClientId] = useState('');
  const [chambreId, setChambreId] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');

  // ---------- Édition des dates ----------
  const [reservationEnEdition, setReservationEnEdition] = useState(null);
  const [nouvelleDateArrivee, setNouvelleDateArrivee] = useState('');
  const [nouvelleDateDepart, setNouvelleDateDepart] = useState('');
  const [editionEnCours, setEditionEnCours] = useState(false);
  const [erreurEdition, setErreurEdition] = useState('');

  // ---------- Annulation ----------
  const [reservationAAnnuler, setReservationAAnnuler] = useState(null);
  const [annulationEnCours, setAnnulationEnCours] = useState(false);

  // ---------- Suppression définitive ----------
  const [reservationASupprimer, setReservationASupprimer] = useState(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [confirmationVidageOuverte, setConfirmationVidageOuverte] = useState(false);
  const [vidageEnCours, setVidageEnCours] = useState(false);

  // ---------- Gestion du séjour (check-in fait, avant check-out) ----------
  const [reservationSejour, setReservationSejour] = useState(null);
  const [sejour, setSejour] = useState(null);
  const [chargementSejour, setChargementSejour] = useState(false);
  const [serviceIdChoisi, setServiceIdChoisi] = useState('');
  const [quantiteChoisie, setQuantiteChoisie] = useState('1');
  const [ajoutEnCours, setAjoutEnCours] = useState(false);
  const [heuresAAjouter, setHeuresAAjouter] = useState('1');
  const [prolongationEnCours, setProlongationEnCours] = useState(false);
  const [checkInEnCours, setCheckInEnCours] = useState(null);
  const [checkOutEnCours, setCheckOutEnCours] = useState(false);

  useEffect(() => {
    chargerReservations();
    getClients().then(setClients).catch(() => {});
    getServices().then((s) => setServices(s.filter((x) => CATEGORIES_BAR.includes(x.categorie)))).catch(() => {});
  }, []);

  async function chargerReservations() {
    try {
      setChargement(true);
      setErreur('');
      setReservations(await getReservations());
    } catch (err) {
      setErreur('Impossible de charger les réservations');
    } finally {
      setChargement(false);
    }
  }

  // ============================================================
  // Création
  // ============================================================

  function fermerModal() {
    setModalOuverte(false);
    setDateArrivee(''); setDateDepart(''); setModeTarification('NUITEE'); setNombreHeures('1');
    setChambresDisponibles(null); setClientId(''); setChambreId(''); setErreurFormulaire('');
  }

async function handleConsulterDisponibilites(e) {
  e.preventDefault();
  setErreurFormulaire('');
  setChambresDisponibles(null);
  setChambreId('');
  setRechercheEnCours(true);
  try {
    let depart = dateDepart;
    if (modeTarification === 'HORAIRE') {
      const arrivee = new Date(dateArrivee);
      const heures = Number(nombreHeures) || 1;
      depart = new Date(arrivee.getTime() + heures * 3600000).toISOString();
    }
    setChambresDisponibles(await consulterDisponibilites(dateArrivee, depart));
  } catch (err) {
    setErreurFormulaire(err.response?.data?.message || 'Erreur lors de la vérification');
  } finally {
    setRechercheEnCours(false);
  }
}

async function handleCreerReservation(e) {
  e.preventDefault();
  setErreurFormulaire('');
  setCreationEnCours(true);
  try {
    await creerReservation({
      clientId: Number(clientId),
      chambreId: Number(chambreId),
      dateArrivee,
      dateDepart: modeTarification === 'NUITEE' ? dateDepart : undefined,
      modeTarification,
      nombreHeures: modeTarification === 'HORAIRE' ? Number(nombreHeures) : undefined,
    });
    fermerModal();
    setSucces('Réservation créée.');
    await chargerReservations();
  } catch (err) {
    setErreurFormulaire(err.response?.data?.message || 'Erreur lors de la création');
  } finally {
    setCreationEnCours(false);
  }
}

  // ============================================================
  // Édition des dates
  // ============================================================

  function ouvrirEdition(resa) {
    setReservationEnEdition(resa);
    setNouvelleDateArrivee(resa.dateArrivee.slice(0, 10));
    setNouvelleDateDepart(resa.dateDepart.slice(0, 10));
    setErreurEdition('');
  }

  async function handleSoumettreEdition(e) {
    e.preventDefault();
    setErreurEdition('');
    setEditionEnCours(true);
    try {
      await modifierReservation(reservationEnEdition.id, {
        dateArrivee: nouvelleDateArrivee,
        dateDepart: nouvelleDateDepart,
      });
      setReservationEnEdition(null);
      setSucces('Réservation modifiée.');
      await chargerReservations();
    } catch (err) {
      setErreurEdition(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setEditionEnCours(false);
    }
  }

  // ============================================================
  // Annulation / Suppression
  // ============================================================

  async function handleConfirmerAnnulation() {
    setAnnulationEnCours(true);
    try {
      const resultat = await annulerReservation(reservationAAnnuler.id);
      setSucces(
        resultat.remboursementRequis
          ? 'Réservation annulée. Un remboursement est requis (voir Paiements).'
          : 'Réservation annulée avec succès.'
      );
      setReservationAAnnuler(null);
      await chargerReservations();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de l\'annulation');
      setReservationAAnnuler(null);
    } finally {
      setAnnulationEnCours(false);
    }
  }

  async function handleConfirmerSuppression() {
    setSuppressionEnCours(true);
    try {
      await supprimerReservation(reservationASupprimer.id);
      setReservationASupprimer(null);
      setSucces('Réservation supprimée définitivement.');
      await chargerReservations();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la suppression');
      setReservationASupprimer(null);
    } finally {
      setSuppressionEnCours(false);
    }
  }

  async function handleConfirmerVidage() {
    setVidageEnCours(true);
    try {
      const resultat = await viderReservationsAnnulees();
      setSucces(resultat.message);
      setConfirmationVidageOuverte(false);
      await chargerReservations();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors du nettoyage');
    } finally {
      setVidageEnCours(false);
    }
  }

  // ============================================================
  // Séjour : check-in / consommations / heures sup / check-out
  // ============================================================

  async function handleCheckIn(resa) {
    setCheckInEnCours(resa.id);
    try {
      await checkIn(resa.id);
      setSucces('Check-in effectué.');
      await chargerReservations();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors du check-in');
    } finally {
      setCheckInEnCours(null);
    }
  }

  async function ouvrirGestionSejour(resa) {
    setReservationSejour(resa);
    setChargementSejour(true);
    try {
      setSejour(await getSejourParReservation(resa.id));
    } catch (err) {
      setErreur('Impossible de charger le séjour');
    } finally {
      setChargementSejour(false);
    }
  }

  async function rafraichirSejour() {
    setSejour(await getSejourParReservation(reservationSejour.id));
  }

  async function handleAjouterConsommation(e) {
    e.preventDefault();
    if (!serviceIdChoisi) return;
    setAjoutEnCours(true);
    try {
      await ajouterConsommation(sejour.id, Number(serviceIdChoisi), Number(quantiteChoisie));
      setServiceIdChoisi(''); setQuantiteChoisie('1');
      await rafraichirSejour();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de l\'ajout');
    } finally {
      setAjoutEnCours(false);
    }
  }

  async function handleSupprimerConsommation(id) {
    try {
      await supprimerConsommation(id);
      await rafraichirSejour();
    } catch (err) {
      setErreur('Impossible de supprimer cette consommation');
    }
  }

  async function handleAjouterHeures(e) {
    e.preventDefault();
    setProlongationEnCours(true);
    try {
      await ajouterHeuresSupplementaires(sejour.id, Number(heuresAAjouter));
      setSucces(`${heuresAAjouter}h ajoutée(s) au séjour.`);
      setHeuresAAjouter('1');
      await rafraichirSejour();
      await chargerReservations(); // le montantTotal de la réservation a changé
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la prolongation');
    } finally {
      setProlongationEnCours(false);
    }
  }

  async function handleCheckOut() {
    setCheckOutEnCours(true);
    try {
      await checkOut(sejour.id);
      setSucces('Check-out effectué. La chambre est passée en nettoyage.');
      setReservationSejour(null);
      setSejour(null);
      await chargerReservations();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors du check-out');
    } finally {
      setCheckOutEnCours(false);
    }
  }

  const chambreChoisie = chambresDisponibles?.find((c) => c.id === Number(chambreId));
  const nombreAnnulees = reservations.filter((r) => r.statut === 'ANNULEE').length;
  const totalConsommations = sejour?.consommations?.reduce((s, c) => s + Number(c.prixApplique) * c.quantite, 0) || 0;
  const totalHeuresSup = sejour?.heuresSupplementaires?.reduce((s, h) => s + Number(h.montant), 0) || 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1>Réservations</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>
            {reservations.length} réservation{reservations.length > 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {nombreAnnulees > 0 && (
            <Button variante="secondaire" onClick={() => setConfirmationVidageOuverte(true)}>
              Vider les annulées ({nombreAnnulees})
            </Button>
          )}
          <Button onClick={() => setModalOuverte(true)}>+ Nouvelle réservation</Button>
        </div>
      </div>

      {erreur && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="erreur">{erreur}</Alerte></div>}
      {succes && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="succes">{succes}</Alerte></div>}

      {/* ---------- Liste ---------- */}
      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : reservations.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>Aucune réservation enregistrée.</p>
        </Carte>
      ) : (
        <Carte padding="0">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  {['Client', 'Chambre', 'Mode', 'Arrivée', 'Départ', 'Montant', 'Statut', ''].map((h) => (
                    <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map((resa) => (
                  <tr key={resa.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {resa.client ? `${resa.client.prenom || ''} ${resa.client.nom || ''}`.trim() || resa.client.telephone : 'Client supprimé'}
                    </td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13 }}>
                      {resa.chambre ? `N°${resa.chambre.numero}` : '—'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--slate)' }}>
                      {resa.modeTarification === 'HORAIRE' ? `Horaire (${resa.nombreHeures}h)` : `Nuitée (${resa.nombreNuits}n)`}
                    </td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)', whiteSpace: 'nowrap' }}>{new Date(resa.dateArrivee).toLocaleDateString('fr-FR')}</td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)', whiteSpace: 'nowrap' }}>{new Date(resa.dateDepart).toLocaleDateString('fr-FR')}</td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500 }}>{resa.montantTotal}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}><Badge label={resa.statut} ton={TON_STATUT_RESERVATION[resa.statut]} /></td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {resa.statut === 'CONFIRMEE' && (
                          <Button variante="secondaire" taille="sm" onClick={() => handleCheckIn(resa)} enCours={checkInEnCours === resa.id}>Check-in</Button>
                        )}
                        {resa.statut === 'EN_COURS' && (
                          <Button variante="secondaire" taille="sm" onClick={() => ouvrirGestionSejour(resa)}>Gérer le séjour</Button>
                        )}
                        {['EN_ATTENTE'].includes(resa.statut) && (
                          <>
                            <Button variante="secondaire" taille="sm" onClick={() => ouvrirEdition(resa)}>Modifier</Button>
                            <Button variante="secondaire" taille="sm" onClick={() => setReservationAAnnuler(resa)}>Annuler</Button>
                          </>
                        )}
                        {resa.statut === 'CONFIRMEE' && (
                          <Button variante="secondaire" taille="sm" onClick={() => setReservationAAnnuler(resa)}>Annuler</Button>
                        )}
                        {resa.statut === 'ANNULEE' && (
                          <Button variante="danger" taille="sm" onClick={() => setReservationASupprimer(resa)}>Supprimer</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>
      )}

      {/* ---------- Modal création (2 étapes) ---------- */}
      <Modal ouvert={modalOuverte} onFermer={fermerModal} titre="Nouvelle réservation" largeur={540}>
       <form onSubmit={handleConsulterDisponibilites} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
  <div style={{ display: 'flex', gap: 8 }}>
    <button type="button" onClick={() => setModeTarification('NUITEE')} style={{
      flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
      border: `1.5px solid ${modeTarification === 'NUITEE' ? 'var(--signal)' : 'var(--line)'}`,
      background: modeTarification === 'NUITEE' ? 'var(--signal-dim-soft)' : 'transparent',
      color: modeTarification === 'NUITEE' ? 'var(--signal-dark)' : 'var(--slate)',
    }}>Nuitée</button>
    <button type="button" onClick={() => setModeTarification('HORAIRE')} style={{
      flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
      border: `1.5px solid ${modeTarification === 'HORAIRE' ? 'var(--signal)' : 'var(--line)'}`,
      background: modeTarification === 'HORAIRE' ? 'var(--signal-dim-soft)' : 'transparent',
      color: modeTarification === 'HORAIRE' ? 'var(--signal-dark)' : 'var(--slate)',
    }}>Horaire</button>
  </div>

  {modeTarification === 'NUITEE' ? (
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      <div style={{ flex: 1 }}>
        <Champ label="Arrivée">
          <input type="date" min={aujourdHui()} value={dateArrivee} onChange={(e) => setDateArrivee(e.target.value)} required style={styleInput} {...focusHandlers} />
        </Champ>
      </div>
      <div style={{ flex: 1 }}>
        <Champ label="Départ">
          <input type="date" min={dateArrivee || aujourdHui()} value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} required style={styleInput} {...focusHandlers} />
        </Champ>
      </div>
    </div>
  ) : (
    <>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <div style={{ flex: 2 }}>
          <Champ label="Date et heure d'arrivée">
            <input
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              value={dateArrivee}
              onChange={(e) => setDateArrivee(e.target.value)}
              required
              style={styleInput}
              {...focusHandlers}
            />
          </Champ>
        </div>
        <div style={{ flex: 1 }}>
          <Champ label="Nombre d'heures">
            <input type="number" min="1" value={nombreHeures} onChange={(e) => setNombreHeures(e.target.value)} style={styleInput} {...focusHandlers} />
          </Champ>
        </div>
      </div>

      {dateArrivee && nombreHeures && (
        <p style={{ fontSize: 12.5, color: 'var(--slate)', margin: 0 }}>
          Départ prévu : <strong className="mono" style={{ color: 'var(--ink)' }}>
            {new Date(new Date(dateArrivee).getTime() + Number(nombreHeures) * 3600000).toLocaleString('fr-FR')}
          </strong>
        </p>
      )}
    </>
  )}

  <Button type="submit" variante="secondaire" enCours={rechercheEnCours}>Vérifier les disponibilités</Button>
</form>

        {chambresDisponibles && (
          <form onSubmit={handleCreerReservation} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {chambresDisponibles.length === 0 ? (
              <Alerte variante="erreur">Aucune chambre disponible sur ces dates.</Alerte>
            ) : (
              <>
                <Champ label="Client">
                  <select value={clientId} onChange={(e) => setClientId(e.target.value)} required style={styleInput}>
                    <option value="">-- Choisir --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {[c.prenom, c.nom].filter(Boolean).join(' ') || c.telephone}
                      </option>
                    ))}
                  </select>
                </Champ>

                <Champ label={`Chambre disponible (${chambresDisponibles.length})`}>
                  <select value={chambreId} onChange={(e) => setChambreId(e.target.value)} required style={styleInput}>
                    <option value="">-- Choisir --</option>
                    {chambresDisponibles.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        N°{ch.numero} — {ch.typeChambre.libelle}
                        {modeTarification === 'HORAIRE'
                          ? ch.typeChambre.prixPremiereHeure ? ` (${ch.typeChambre.prixPremiereHeure}/1ère h)` : ' (tarif horaire non configuré)'
                          : ` (${ch.typeChambre.prixParNuit}/nuit)`}
                      </option>
                    ))}
                  </select>
                </Champ>

                {chambreChoisie && (
                  <div style={{ background: 'var(--signal-dim-soft)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--signal-dark)' }}>
                      {modeTarification === 'HORAIRE' ? 'Tarif 1ère heure' : 'Prix par nuit'}
                    </span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--signal-dark)' }}>
                      {modeTarification === 'HORAIRE' ? chambreChoisie.typeChambre.prixPremiereHeure : chambreChoisie.typeChambre.prixParNuit}
                    </span>
                  </div>
                )}
              </>
            )}

            {erreurFormulaire && <Alerte variante="erreur">{erreurFormulaire}</Alerte>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variante="secondaire" onClick={fermerModal}>Annuler</Button>
              <Button type="submit" enCours={creationEnCours} disabled={chambresDisponibles.length === 0}>
                Confirmer la réservation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ---------- Modal édition des dates ---------- */}
      <Modal ouvert={!!reservationEnEdition} onFermer={() => setReservationEnEdition(null)} titre="Modifier les dates" largeur={380}>
        {reservationEnEdition && (
          <form onSubmit={handleSoumettreEdition} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ fontSize: 13, color: 'var(--slate)', margin: 0 }}>
              Chambre N°{reservationEnEdition.chambre?.numero ?? '—'} — {reservationEnEdition.client ? `${reservationEnEdition.client.prenom || ''} ${reservationEnEdition.client.nom || ''}`.trim() : 'Client supprimé'}
            </p>
            <Champ label="Nouvelle date d'arrivée">
              <input type="date" min={aujourdHui()} value={nouvelleDateArrivee} onChange={(e) => setNouvelleDateArrivee(e.target.value)} required style={styleInput} {...focusHandlers} />
            </Champ>
            <Champ label="Nouvelle date de départ">
              <input type="date" min={nouvelleDateArrivee || aujourdHui()} value={nouvelleDateDepart} onChange={(e) => setNouvelleDateDepart(e.target.value)} required style={styleInput} {...focusHandlers} />
            </Champ>
            {erreurEdition && <Alerte variante="erreur">{erreurEdition}</Alerte>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variante="secondaire" onClick={() => setReservationEnEdition(null)}>Annuler</Button>
              <Button type="submit" enCours={editionEnCours}>Enregistrer</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ---------- Confirmation annulation ---------- */}
      <ModalConfirmation
        ouvert={!!reservationAAnnuler}
        onFermer={() => setReservationAAnnuler(null)}
        onConfirmer={handleConfirmerAnnulation}
        titre="Annuler la réservation"
        message={
          reservationAAnnuler
            ? `Confirmer l'annulation de la réservation ${reservationAAnnuler.client ? `de ${reservationAAnnuler.client.prenom || ''} ${reservationAAnnuler.client.nom || ''}`.trim() : ''} (chambre N°${reservationAAnnuler.chambre?.numero ?? '—'}) ? Cette action est irréversible.`
            : ''
        }
        texteConfirmer="Annuler la réservation"
        enCours={annulationEnCours}
      />

      {/* ---------- Confirmation suppression définitive ---------- */}
      <ModalConfirmation
        ouvert={!!reservationASupprimer}
        onFermer={() => setReservationASupprimer(null)}
        onConfirmer={handleConfirmerSuppression}
        titre="Supprimer définitivement"
        message={
          reservationASupprimer
            ? `Supprimer définitivement cette réservation ? Cette action efface aussi son historique de paiement et ne peut pas être annulée.`
            : ''
        }
        texteConfirmer="Supprimer définitivement"
        enCours={suppressionEnCours}
      />

      {/* ---------- Vidage en masse ---------- */}
      <ModalConfirmation
        ouvert={confirmationVidageOuverte}
        onFermer={() => setConfirmationVidageOuverte(false)}
        onConfirmer={handleConfirmerVidage}
        titre="Vider les réservations annulées"
        message={`Supprimer définitivement les ${nombreAnnulees} réservation(s) annulée(s) ? Les réservations avec un paiement non remboursé seront automatiquement ignorées et conservées.`}
        texteConfirmer="Vider"
        enCours={vidageEnCours}
      />

      {/* ---------- Gestion du séjour : consommations + heures sup + check-out ---------- */}
      <Modal ouvert={!!reservationSejour} onFermer={() => { setReservationSejour(null); setSejour(null); }} titre="Gestion du séjour" largeur={560}>
        {chargementSejour ? (
          <p style={{ color: 'var(--slate)' }}>Chargement...</p>
        ) : sejour && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <p style={{ fontSize: 13, color: 'var(--slate)', margin: 0 }}>
              Entrée le <span className="mono">{new Date(sejour.dateEntree).toLocaleString('fr-FR')}</span>
            </p>

            {/* ---------- Consommations bar/restaurant ---------- */}
            <div>
              <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8, fontWeight: 500 }}>Consommations</p>
              <form onSubmit={handleAjouterConsommation} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
                <div style={{ flex: 2 }}>
                  <select value={serviceIdChoisi} onChange={(e) => setServiceIdChoisi(e.target.value)} style={styleInput}>
                    <option value="">-- Choisir un service --</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.nom} ({s.prix})</option>)}
                  </select>
                </div>
                <div style={{ width: 70 }}>
                  <input type="number" min="1" value={quantiteChoisie} onChange={(e) => setQuantiteChoisie(e.target.value)} style={styleInput} />
                </div>
                <Button type="submit" taille="sm" enCours={ajoutEnCours} disabled={!serviceIdChoisi}>Ajouter</Button>
              </form>

              {sejour.consommations.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--slate-light)' }}>Aucune consommation enregistrée.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sejour.consommations.map((c) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                      <span>{c.service.nom} × {c.quantite}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="mono">{(Number(c.prixApplique) * c.quantite).toFixed(2)}</span>
                        <button onClick={() => handleSupprimerConsommation(c.id)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sejour.consommations.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13, marginTop: 8 }}>
                  <span>Total consommations</span>
                  <span className="mono">{totalConsommations.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* ---------- Heures supplémentaires (mode horaire uniquement) ---------- */}
            {reservationSejour.modeTarification === 'HORAIRE' && (
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-4)' }}>
                <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8, fontWeight: 500 }}>Prolonger le séjour</p>
                <form onSubmit={handleAjouterHeures} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Champ label="Heures supplémentaires">
                      <input type="number" min="1" value={heuresAAjouter} onChange={(e) => setHeuresAAjouter(e.target.value)} style={styleInput} />
                    </Champ>
                  </div>
                  <Button type="submit" taille="sm" variante="secondaire" enCours={prolongationEnCours}>Ajouter</Button>
                </form>

                {sejour.heuresSupplementaires?.length > 0 && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sejour.heuresSupplementaires.map((h) => (
                        <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                          <span>+{h.nombreHeures}h ({new Date(h.dateAjout).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})</span>
                          <span className="mono">{h.montant}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13, marginTop: 8 }}>
                      <span>Total heures sup.</span>
                      <span className="mono">{totalHeuresSup.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <Button variante="danger" onClick={handleCheckOut} enCours={checkOutEnCours}>Check-out</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}