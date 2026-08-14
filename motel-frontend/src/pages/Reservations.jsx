import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getReservations, consulterDisponibilites, creerReservation, annulerReservation, confirmerReservation,
  modifierReservation, supprimerReservation, viderReservationsAnnulees,
} from '../services/reservation.service';
import {
  checkIn, checkOut, getSejourParReservation, ajouterNuitsSupplementaires,
  ajouterHeuresSupplementaires,
} from '../services/sejour.service';
import Button from '../components/ui/Button';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import ModalConfirmation from '../components/ui/ModalConfirmation';
import Alerte from '../components/ui/Alerte';
import Badge, { TON_STATUT_RESERVATION } from '../components/ui/Badge';
import ChampClient from '../components/ChampClient';


// L'écran est rangé par moment du séjour, pas par statut technique : la standardiste
// pense « qui doit arriver », « qui est là », « qui est parti », pas EN_ATTENTE ni EN_COURS.
// « Toutes » vient en tête : c'est la vue d'ensemble, les filtres par moment du
// séjour la précisent ensuite.
const SITUATIONS = [
  { cle: 'TOUTES', label: 'Toutes', statuts: null,
    aide: 'La totalité des réservations.',
    vide: 'Aucune réservation.' },
  { cle: 'A_VALIDER', label: 'À confirmer', statuts: ['EN_ATTENTE'],
    aide: 'Réservations prises mais pas encore confirmées. Elles expirent toutes seules passé le délai.',
    vide: 'Aucune réservation en attente de confirmation.' },
  { cle: 'ATTENDUES', label: 'Attendues', statuts: ['CONFIRMEE'],
    aide: 'Le client est attendu, la chambre lui est gardée.',
    vide: 'Aucun client attendu.' },
  { cle: 'SUR_PLACE', label: 'Sur place', statuts: ['EN_COURS'],
    aide: 'Clients actuellement dans leur chambre.',
    vide: 'Aucun client sur place.' },
  { cle: 'PARTIS', label: 'Séjours terminés', statuts: ['TERMINEE'],
    aide: 'Séjours clôturés, chambre rendue.',
    vide: 'Aucun séjour terminé.' },
  { cle: 'SANS_SUITE', label: 'Sans suite', statuts: ['ANNULEE', 'EXPIREE'],
    aide: 'Réservations annulées, ou expirées faute de confirmation.',
    vide: 'Aucune réservation annulée ou expirée.' },
];

// Libellés affichés à la place des statuts techniques
const LIBELLE_STATUT = {
  EN_ATTENTE: 'À confirmer',
  CONFIRMEE: 'Attendue',
  EN_COURS: 'Sur place',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
  EXPIREE: 'Non venue',
};

function aujourdHui() {
  return new Date().toISOString().slice(0, 10);
}

export default function Reservations() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
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
  // Le client est saisi directement dans le formulaire : soit il est reconnu par son
  // numéro (clientId renseigné), soit il sera créé avec la réservation.
  const [clientSaisi, setClientSaisi] = useState({ telephone: '', nom: '', prenom: '', clientId: null });
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
  const [heuresAAjouter, setHeuresAAjouter] = useState('1');
  const [nuitsAAjouter, setNuitsAAjouter] = useState('1');
  const [prolongationEnCours, setProlongationEnCours] = useState(false);
  // Les bandeaux de la page sont derrière le voile du modal : une confirmation
  // envoyée là est invisible tant que le modal est ouvert. Le séjour a donc son
  // propre message, affiché à l'intérieur.
  const [messageSejour, setMessageSejour] = useState(null); // { ton: 'succes' | 'erreur', texte }
  const [checkInEnCours, setCheckInEnCours] = useState(null);
  const [checkOutEnCours, setCheckOutEnCours] = useState(false);
  const [noteImpayee, setNoteImpayee] = useState(null);
  const [confirmationEnCours, setConfirmationEnCours] = useState(null);
  // On ouvre sur le premier onglet, « Toutes » : la vue d'ensemble d'abord, on
  // affine ensuite. Dérivé de la liste pour rester juste si l'ordre change.
  const [situation, setSituation] = useState(SITUATIONS[0].cle);

  // La liste complète des clients n'est pas chargée : la recherche se fait par
  // numéro de téléphone au moment de la saisie. La carte du bar non plus — la
  // réception ne saisit plus de consommation.
  useEffect(() => {
    chargerReservations();
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
    setChambresDisponibles(null); setClientSaisi({ telephone: '', nom: '', prenom: '', clientId: null }); setChambreId(''); setErreurFormulaire('');
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
      // Client reconnu par son numéro, sinon le serveur crée la fiche à la volée
      ...(clientSaisi.clientId
        ? { clientId: clientSaisi.clientId }
        : { client: { telephone: clientSaisi.telephone, nom: clientSaisi.nom, prenom: clientSaisi.prenom } }),
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
      setSucces('Client installé. La chambre est maintenant occupée.');
      await chargerReservations();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible d\'installer le client');
    } finally {
      setCheckInEnCours(null);
    }
  }

  async function ouvrirGestionSejour(resa) {
    setReservationSejour(resa);
    setMessageSejour(null);
    setNoteImpayee(null);
    setChargementSejour(true);
    try {
      setSejour(await getSejourParReservation(resa.id));
    } catch (err) {
      setErreur('Impossible de charger le séjour');
    } finally {
      setChargementSejour(false);
    }
  }

  function fermerGestionSejour() {
    setReservationSejour(null);
    setSejour(null);
    setMessageSejour(null);
    setNoteImpayee(null);
  }

  // Renvoie le séjour rafraîchi en plus de le poser dans l'état : les appelants
  // ont besoin des nouvelles valeurs tout de suite, sans attendre le rendu.
  async function rafraichirSejour() {
    const frais = await getSejourParReservation(reservationSejour.id);
    setSejour(frais);
    return frais;
  }


  // Une seule action « prolonger » côté écran : c'est le mode de facturation du
  // séjour qui décide si l'on ajoute des heures ou des nuits.
  async function handleProlonger(e) {
    e.preventDefault();
    setProlongationEnCours(true);
    setMessageSejour(null);
    try {
      let texte;
      if (modeSejour === 'HORAIRE') {
        const heures = Number(heuresAAjouter);
        await ajouterHeuresSupplementaires(sejour.id, heures);
        texte = `Séjour prolongé de ${heures}h.`;
        setHeuresAAjouter('1');
      } else {
        const nuits = Number(nuitsAAjouter);
        const { montantAjoute } = await ajouterNuitsSupplementaires(sejour.id, nuits);
        texte = `Séjour prolongé de ${nuits} nuit${nuits > 1 ? 's' : ''} (+${montantAjoute}).`;
        setNuitsAAjouter('1');
      }
      const sejourAJour = await rafraichirSejour();
      const finAJour = new Date(sejourAJour.reservation.dateDepart);
      setMessageSejour({
        ton: 'succes',
        texte: `${texte} Nouveau départ prévu le ${finAJour.toLocaleDateString('fr-FR')}.`,
      });
      await chargerReservations(); // le montantTotal de la réservation a changé
    } catch (err) {
      setMessageSejour({ ton: 'erreur', texte: err.response?.data?.message || 'Erreur lors de la prolongation' });
    } finally {
      setProlongationEnCours(false);
    }
  }

  async function handleCheckOut(forcerSansPaiement = false) {
    setCheckOutEnCours(true);
    setNoteImpayee(null);
    setMessageSejour(null);
    try {
      await checkOut(sejour.id, forcerSansPaiement);
      setSucces('Départ enregistré. La chambre passe en nettoyage.');
      fermerGestionSejour();
      await chargerReservations();
    } catch (err) {
      // Le serveur refuse le départ s'il reste un solde dû : on affiche la note
      // détaillée plutôt qu'un message d'erreur sec.
      if (err.response?.status === 409 && err.response.data?.soldeImpaye) {
        setNoteImpayee(err.response.data.note);
      } else {
        setMessageSejour({ ton: 'erreur', texte: err.response?.data?.message || 'Impossible d\'enregistrer le départ' });
      }
    } finally {
      setCheckOutEnCours(false);
    }
  }

  async function handleConfirmerReservation(resa) {
    setConfirmationEnCours(resa.id);
    try {
      await confirmerReservation(resa.id);
      setSucces('Réservation confirmée.');
      await chargerReservations();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la confirmation');
    } finally {
      setConfirmationEnCours(null);
    }
  }

  const statutsDeLaSituation = SITUATIONS.find((s) => s.cle === situation)?.statuts;
  const reservationsAffichees = statutsDeLaSituation
    ? reservations.filter((r) => statutsDeLaSituation.includes(r.statut))
    : reservations;

  const chambreChoisie = chambresDisponibles?.find((c) => c.id === Number(chambreId));
  const nombreAnnulees = reservations.filter((r) => r.statut === 'ANNULEE').length;
  const totalConsommations = sejour?.consommations?.reduce((s, c) => s + Number(c.prixApplique) * c.quantite, 0) || 0;
  const totalHeuresSup = sejour?.heuresSupplementaires?.reduce((s, h) => s + Number(h.montant), 0) || 0;

  // La réservation renvoyée avec le séjour est la version fraîche : après une
  // prolongation, c'est elle qui porte la nouvelle date de départ, pas la ligne
  // du tableau sur laquelle on a cliqué.
  const reservationDuSejour = sejour?.reservation || reservationSejour;
  const modeSejour = reservationDuSejour?.modeTarification;
  const finPrevue = reservationDuSejour ? new Date(reservationDuSejour.dateDepart) : null;
  const departDepasse = finPrevue && finPrevue < new Date();

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

      {/* ---------- Rangement par situation ----------
          Tout mélangé, on ne distingue plus ce qui demande une action de ce qui
          est déjà réglé. Chaque onglet correspond à un moment du séjour. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        {SITUATIONS.map(({ cle, label, aide }) => {
          const nombre = reservations.filter((r) => cle === 'TOUTES' || SITUATIONS.find((s) => s.cle === cle).statuts.includes(r.statut)).length;
          const actif = situation === cle;
          return (
            <button
              key={cle}
              onClick={() => setSituation(cle)}
              title={aide}
              style={{
                padding: '8px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13,
                fontWeight: actif ? 600 : 500,
                border: `1px solid ${actif ? 'var(--moss)' : 'var(--line)'}`,
                background: actif ? 'var(--moss)' : 'transparent',
                color: actif ? '#fff' : 'var(--slate)',
              }}
            >
              {label} <span style={{ opacity: 0.75, fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{nombre}</span>
            </button>
          );
        })}
      </div>

      {/* ---------- Liste ---------- */}
      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : reservations.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>Aucune réservation enregistrée.</p>
        </Carte>
      ) : reservationsAffichees.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>{SITUATIONS.find((s) => s.cle === situation)?.vide}</p>
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
                {reservationsAffichees.map((resa) => (
                  <tr key={resa.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {resa.client ? `${resa.client.prenom || ''} ${resa.client.nom || ''}`.trim() || resa.client.telephone : 'Client supprimé'}
                    </td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13 }}>
                      {resa.chambre ? `N°${resa.chambre.numero}` : '-'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--slate)' }}>
                      {resa.modeTarification === 'HORAIRE' ? `Horaire (${resa.nombreHeures}h)` : `Nuitée (${resa.nombreNuits}n)`}
                    </td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)', whiteSpace: 'nowrap' }}>{new Date(resa.dateArrivee).toLocaleDateString('fr-FR')}</td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)', whiteSpace: 'nowrap' }}>{new Date(resa.dateDepart).toLocaleDateString('fr-FR')}</td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {resa.montantTotal}
                      {/* Le reste à payer est calculé par l'API : il tient compte des
                          heures supplémentaires ajoutées après un paiement complet. */}
                      {resa.resteAPayer > 0 && resa.statut !== 'ANNULEE' && (
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>
                          reste {resa.resteAPayer}
                        </span>
                      )}
                      {resa.resteAPayer === 0 && resa.montantPaye > 0 && (
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                          soldé
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Badge label={LIBELLE_STATUT[resa.statut] || resa.statut} ton={TON_STATUT_RESERVATION[resa.statut]} />
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Encaisser depuis la ligne du client : sans ce raccourci il
                            fallait ouvrir Paiements puis retrouver la réservation
                            dans une liste déroulante. */}
                        {resa.resteAPayer > 0 && resa.statut !== 'ANNULEE' && (
                          <Button
                            taille="sm"
                            variante="secondaire"
                            onClick={() => navigate(`/paiements?reservation=${resa.id}`)}
                            title={`Encaisser les ${resa.resteAPayer} restants`}
                          >
                            Régler {resa.resteAPayer}
                          </Button>
                        )}
                        {resa.statut === 'CONFIRMEE' && (
                          <Button
                            taille="sm"
                            onClick={() => handleCheckIn(resa)}
                            enCours={checkInEnCours === resa.id}
                            title="Installer le client dans sa chambre"
                          >
                            Le client est arrivé
                          </Button>
                        )}
                        {resa.statut === 'EN_COURS' && (
                          <Button variante="secondaire" taille="sm" onClick={() => ouvrirGestionSejour(resa)}>Voir le séjour</Button>
                        )}
                        {['EN_ATTENTE'].includes(resa.statut) && (
                          <>
                            {/* Confirmer sans encaisser la totalité : réservation par
                                téléphone, acompte, client de confiance. */}
                            <Button taille="sm" onClick={() => handleConfirmerReservation(resa)} enCours={confirmationEnCours === resa.id}>Confirmer</Button>
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
                {/* Plus de liste déroulante : on tape le numéro, la fiche est
                    retrouvée ou créée avec la réservation. */}
                <ChampClient valeur={clientSaisi} onChanger={setClientSaisi} />

                <Champ label={`Chambre disponible (${chambresDisponibles.length})`}>
                  <select value={chambreId} onChange={(e) => setChambreId(e.target.value)} required style={styleInput}>
                    <option value="">-- Choisir --</option>
                    {chambresDisponibles.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        N°{ch.numero} · {ch.typeChambre.libelle}
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
              Chambre N°{reservationEnEdition.chambre?.numero ?? '-'} · {reservationEnEdition.client ? `${reservationEnEdition.client.prenom || ''} ${reservationEnEdition.client.nom || ''}`.trim() : 'Client supprimé'}
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
            ? `Confirmer l'annulation de la réservation ${reservationAAnnuler.client ? `de ${reservationAAnnuler.client.prenom || ''} ${reservationAAnnuler.client.nom || ''}`.trim() : ''} (chambre N°${reservationAAnnuler.chambre?.numero ?? '-'}) ? Cette action est irréversible.`
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
      <Modal ouvert={!!reservationSejour} onFermer={fermerGestionSejour} titre="Séjour en cours" largeur={560}>
        {chargementSejour ? (
          <p style={{ color: 'var(--slate)' }}>Chargement...</p>
        ) : sejour && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Le séjour se lit d'abord dans le temps : quand il a commencé, quand
                il doit finir. Sans la fin prévue, impossible de savoir s'il faut
                prolonger ou réclamer la chambre. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-5)', fontSize: 13, color: 'var(--slate)' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12 }}>Entrée</p>
                <p style={{ margin: 0 }} className="mono">{new Date(sejour.dateEntree).toLocaleString('fr-FR')}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12 }}>Fin prévue</p>
                <p style={{ margin: 0, color: departDepasse ? 'var(--danger)' : 'var(--ink)', fontWeight: departDepasse ? 600 : 400 }} className="mono">
                  {modeSejour === 'HORAIRE'
                    ? finPrevue.toLocaleString('fr-FR')
                    : finPrevue.toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>

            {departDepasse && (
              <p style={{
                margin: 0, fontSize: 13, color: 'var(--danger)', fontWeight: 500,
                background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)',
              }}>
                Le départ prévu est dépassé. Prolongez le séjour ou enregistrez le départ.
              </p>
            )}

            {messageSejour && (
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 500,
                borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)',
                color: messageSejour.ton === 'succes' ? 'var(--success)' : 'var(--danger)',
                background: messageSejour.ton === 'succes' ? 'var(--success-bg)' : 'var(--danger-bg)',
              }}>
                {messageSejour.texte}
              </p>
            )}

            {/* ---------- Consommations : lecture seule à la réception ----------
                Les consommations naissent au bar et rejoignent la note par le point
                de vente. Les saisir aussi depuis ici ouvrait deux portes pour la même
                recette, sans savoir laquelle faisait foi. La réception les consulte —
                il lui faut le montant pour encaisser — mais ne les crée pas. */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0, fontWeight: 500 }}>Consommations du bar</p>
                <span style={{ fontSize: 11, color: 'var(--slate-light)' }}>saisies au bar</span>
              </div>

              {sejour.consommations.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>
                  Aucune consommation portée sur cette chambre.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sejour.consommations.map((c) => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                        <span>{c.service.nom} × {c.quantite}</span>
                        <span className="mono">{(Number(c.prixApplique) * c.quantite).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13, marginTop: 8 }}>
                    <span>Total consommations</span>
                    <span className="mono">{totalConsommations.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* ---------- Prolongation : en heures ou en nuits selon le mode ---------- */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-4)' }}>
              <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8, fontWeight: 500 }}>Prolonger le séjour</p>
              <form onSubmit={handleProlonger} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  {modeSejour === 'HORAIRE' ? (
                    <Champ label="Heures supplémentaires">
                      <input type="number" min="1" value={heuresAAjouter} onChange={(e) => setHeuresAAjouter(e.target.value)} style={styleInput} />
                    </Champ>
                  ) : (
                    <Champ label="Nuits supplémentaires">
                      <input type="number" min="1" value={nuitsAAjouter} onChange={(e) => setNuitsAAjouter(e.target.value)} style={styleInput} />
                    </Champ>
                  )}
                </div>
                <Button type="submit" taille="sm" variante="secondaire" enCours={prolongationEnCours}>Ajouter</Button>
              </form>
              <p style={{ fontSize: 12, color: 'var(--slate-light)', margin: '0 0 12px' }}>
                La date de départ est repoussée d'autant et le supplément s'ajoute à la note.
              </p>

              {modeSejour === 'HORAIRE' && (
                <>
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
                </>
              )}
            </div>

            {/* Le serveur calcule la note complète et refuse si un solde reste dû */}
            {noteImpayee && (
              <div style={{
                background: 'var(--danger-bg)', border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)', fontSize: 13,
              }}>
                <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--danger)' }}>
                  Départ impossible : il reste un solde à régler
                </p>
                {[
                  ['Séjour et heures supplémentaires', noteImpayee.montantReservation],
                  ['Consommations', noteImpayee.montantConsommations],
                  ['Total dû', noteImpayee.totalDu],
                  ['Déjà payé', noteImpayee.dejaPaye],
                ].map(([label, valeur]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--slate)' }}>{label}</span>
                    <span className="mono">{valeur}</span>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', fontWeight: 700,
                  paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--danger)', color: 'var(--danger)',
                }}>
                  <span>Reste à payer</span>
                  <span className="mono">{noteImpayee.resteAPayer}</span>
                </div>
                <p style={{ margin: '12px 0 8px', color: 'var(--slate)' }}>
                  Encaissez ce montant depuis l'écran Paiements, ou laissez partir le client
                  en assumant l'impayé.
                </p>
                <Button variante="danger" taille="sm" onClick={() => handleCheckOut(true)} enCours={checkOutEnCours}>
                  Laisser partir sans encaisser
                </Button>
              </div>
            )}

            <Button variante="danger" onClick={() => handleCheckOut(false)} enCours={checkOutEnCours}>Le client repart</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}