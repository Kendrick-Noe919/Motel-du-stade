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
import Toast, { avecDureeMinimale } from '../components/ui/Toast';
import Badge, { TON_STATUT_RESERVATION } from '../components/ui/Badge';
import LigneTableau from '../components/ui/LigneTableau';
import Icone, { BoutonIcone } from '../components/ui/Icone';
import ChampClient from '../components/ChampClient';


// L'écran est rangé par moment du séjour, pas par statut technique : la standardiste
// pense « qui doit arriver », « qui est là », « qui est parti », pas EN_ATTENTE ni EN_COURS.
// « Toutes » vient en tête : c'est la vue d'ensemble, les filtres par moment du
// séjour la précisent ensuite.
const SITUATIONS = [
  { cle: 'TOUTES', label: 'Toutes', statuts: null,
    aide: 'La totalité des réservations.',
    vide: 'Aucune réservation.' },
  // Les deux échéances concrètes de la journée : qui doit arriver, qui doit partir.
  // Elles se perdaient au milieu de la liste — un client dont l'heure était passée
  // pouvait rester invisible tout en bas. Chacune a désormais son onglet.
  { cle: 'ARRIVEES', label: 'Arrivées du jour', statuts: null, filtre: estUneArriveeDuJour,
    aide: 'Clients attendus aujourd\'hui et pas encore installés, retards compris.',
    vide: 'Aucune arrivée prévue aujourd\'hui.' },
  { cle: 'DEPARTS', label: 'Départs du jour', statuts: null, filtre: estUnDepartDuJour,
    aide: 'Clients dont le départ est prévu aujourd\'hui, retards compris.',
    vide: 'Aucun départ prévu aujourd\'hui.' },
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

// Hiérarchie de texte des fiches et des modals.
//
// Le défaut précédent : intitulés et valeurs partageaient le même gris clair, et
// l'œil ne distinguait plus la question de la réponse. L'intitulé est désormais
// petit et discret, la valeur sombre et appuyée, le titre de section franc.
const ETIQUETTE = { margin: 0, fontSize: 11.5, color: 'var(--slate)' };
const VALEUR = { margin: '3px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--ink)' };
const TITRE_SECTION = { margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' };

const nomDuClient = (resa) => (resa.client
  ? `${resa.client.prenom || ''} ${resa.client.nom || ''}`.trim() || resa.client.telephone
  : 'Client supprimé');

// Un séjour à l'heure se lit à l'heure près ; une nuitée, en jours. Afficher
// « 14/08 » pour un client attendu à 18h ne renseigne sur rien.
function formaterEcheance(valeur, modeTarification) {
  const date = new Date(valeur);
  return modeTarification === 'HORAIRE'
    ? date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR');
}

const formaterDepart = (resa) => formaterEcheance(resa.dateDepart, resa.modeTarification);
const formaterArrivee = (resa) => formaterEcheance(resa.dateArrivee, resa.modeTarification);

// Un départ n'est « dépassé » que pour un client encore dans les murs : une
// réservation attendue ou terminée n'a rien à signaler.
const estUnDepartDepasse = (resa) =>
  resa.statut === 'EN_COURS' && new Date(resa.dateDepart) < new Date();

// Les dates restent négociables tant que le client n'est pas attendu dans la
// journée. Un client qui a réservé pour la semaine prochaine rappelle souvent pour
// décaler : la réception doit pouvoir le faire, même après confirmation.
//
// Miroir de la règle du serveur (raisonDeRefuserLeChangementDeDates) : ici elle
// décide seulement d'afficher le bouton, c'est le serveur qui fait autorité.
function peutChangerLesDates(resa) {
  if (resa.statut === 'EN_ATTENTE') return true;
  if (resa.statut !== 'CONFIRMEE') return false;
  const finDuJour = new Date();
  finDuJour.setHours(23, 59, 59, 999);
  return new Date(resa.dateArrivee) > finDuJour;
}

const finDuJour = () => {
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);
  return fin;
};

// Les départs du jour : ceux d'aujourd'hui et tous les retards accumulés. C'est la
// liste qu'on veut trouver en arrivant le matin.
function estUnDepartDuJour(resa) {
  if (resa.statut !== 'EN_COURS') return false;
  return new Date(resa.dateDepart) <= finDuJour();
}

// Les arrivées du jour : les clients attendus aujourd'hui qui ne sont pas encore
// installés. On garde aussi celles à confirmer — la chambre n'est pas gardée, mais
// la réception doit savoir qu'on l'attend et relancer si besoin.
function estUneArriveeDuJour(resa) {
  if (!['CONFIRMEE', 'EN_ATTENTE'].includes(resa.statut)) return false;
  return new Date(resa.dateArrivee) <= finDuJour();
}

// Une arrivée est « en retard » quand l'heure est passée et que personne n'est venu.
const estUneArriveeDepassee = (resa) =>
  ['CONFIRMEE', 'EN_ATTENTE'].includes(resa.statut) && new Date(resa.dateArrivee) < new Date();

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

  // Remise de fidélité : facultative, jamais pré-cochée.
  const [remiseActive, setRemiseActive] = useState(false);
  const [remiseChambre, setRemiseChambre] = useState('');
  const [remiseBar, setRemiseBar] = useState('');
  const [remiseMotif, setRemiseMotif] = useState('');
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
  // Le formulaire de prolongation est replié tant qu'on n'en a pas besoin, et
  // l'unité (heures ou nuits) se choisit à la demande du client.
  const [prolongationOuverte, setProlongationOuverte] = useState(false);
  const [uniteProlongation, setUniteProlongation] = useState('NUITS');
  // Remise propre à la prolongation, indépendante de celle de la réservation.
  const [remiseProlongationActive, setRemiseProlongationActive] = useState(false);
  const [remiseProlongation, setRemiseProlongation] = useState('');
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
  const [idDetail, setIdDetail] = useState(null); // réservation ouverte en détail
  // Un refus déclenché depuis le détail doit s'expliquer dans le détail. Envoyé au
  // bandeau de la page, il se retrouve derrière le voile du modal : l'utilisateur
  // voit son clic ne rien produire et n'a aucune idée du pourquoi.
  const [messageDetail, setMessageDetail] = useState(null);

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
    setRemiseActive(false); setRemiseChambre(''); setRemiseBar(''); setRemiseMotif('');
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
      // Les remises ne partent que si la case est cochée et le champ rempli :
      // un champ vide ne doit pas se transformer en remise de 0 %.
      ...(remiseActive && Number(remiseChambre) > 0 ? { remiseChambrePourcent: Number(remiseChambre) } : {}),
      ...(remiseActive && Number(remiseBar) > 0 ? { remiseBarPourcent: Number(remiseBar) } : {}),
      ...(remiseActive && remiseMotif ? { remiseMotif } : {}),
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
      await avecDureeMinimale(modifierReservation(reservationEnEdition.id, {
        dateArrivee: nouvelleDateArrivee,
        dateDepart: nouvelleDateDepart,
      }));
      setReservationEnEdition(null);
      setSucces('Nouvelles dates enregistrées.');
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
    setMessageDetail(null);
    try {
      await avecDureeMinimale(checkIn(resa.id));
      setSucces('Client installé. La chambre est maintenant occupée.');
      await chargerReservations();
    } catch (err) {
      signalerEchec(err.response?.data?.message || 'Impossible d\'installer le client');
    } finally {
      setCheckInEnCours(null);
    }
  }

  async function ouvrirGestionSejour(resa) {
    setReservationSejour(resa);
    setMessageSejour(null);
    setNoteImpayee(null);
    setProlongationOuverte(false);
    // Unité pré-positionnée sur le mode du séjour : c'est le cas le plus courant,
    // mais elle reste changeable d'un clic.
    setUniteProlongation(resa.modeTarification === 'HORAIRE' ? 'HEURES' : 'NUITS');
    // Un habitué retrouve sa remise proposée d'avance ; les autres partent sans.
    const remiseDejaAccordee = resa.remiseChambrePourcent || 0;
    setRemiseProlongationActive(remiseDejaAccordee > 0);
    setRemiseProlongation(remiseDejaAccordee > 0 ? String(remiseDejaAccordee) : '');
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


  // C'est l'unité choisie au comptoir qui décide, plus le mode de facturation
  // d'origine : un client arrivé pour trois heures peut vouloir dormir.
  async function handleProlonger(e) {
    e.preventDefault();
    setProlongationEnCours(true);
    setMessageSejour(null);
    try {
      // 0 signifie « explicitement aucune remise » et doit être envoyé : sans lui,
      // le serveur reprendrait la remise de la réservation, alors qu'on vient
      // justement de la décocher.
      const remise = remiseProlongationActive ? Number(remiseProlongation) || 0 : 0;

      let texte;
      if (uniteProlongation === 'HEURES') {
        const heures = Number(heuresAAjouter);
        const { montantAjoute } = await avecDureeMinimale(ajouterHeuresSupplementaires(sejour.id, heures, remise));
        texte = `Séjour prolongé de ${heures} h (+${montantAjoute}${remise > 0 ? `, remise ${remise} %` : ''}).`;
        setHeuresAAjouter('1');
      } else {
        const nuits = Number(nuitsAAjouter);
        const { montantAjoute } = await avecDureeMinimale(ajouterNuitsSupplementaires(sejour.id, nuits, remise));
        texte = `Séjour prolongé de ${nuits} nuit${nuits > 1 ? 's' : ''} (+${montantAjoute}${remise > 0 ? `, remise ${remise} %` : ''}).`;
        setNuitsAAjouter('1');
      }
      setProlongationOuverte(false);
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
    setMessageDetail(null);
    try {
      await avecDureeMinimale(confirmerReservation(resa.id));
      setSucces('Réservation confirmée.');
      await chargerReservations();
    } catch (err) {
      signalerEchec(err.response?.data?.message || 'Erreur lors de la confirmation');
    } finally {
      setConfirmationEnCours(null);
    }
  }

  // Un échec s'affiche là où l'utilisateur a cliqué : dans le détail s'il est
  // ouvert, dans le bandeau de la page sinon.
  function signalerEchec(texte) {
    if (idDetail) setMessageDetail(texte);
    else setErreur(texte);
  }

  // Un onglet filtre soit sur une liste de statuts, soit sur une règle (les départs
  // du jour, qui dépendent de l'heure autant que du statut).
  const filtrerSituation = (cle, liste) => {
    const s = SITUATIONS.find((x) => x.cle === cle);
    if (s?.filtre) return liste.filter(s.filtre);
    if (s?.statuts) return liste.filter((r) => s.statuts.includes(r.statut));
    return liste;
  };

  // Sur les onglets d'échéance, le plus urgent passe en tête : les retards d'abord,
  // puis dans l'ordre des heures.
  const filtrees = filtrerSituation(situation, reservations);
  const reservationsAffichees = situation === 'DEPARTS'
    ? [...filtrees].sort((a, b) => new Date(a.dateDepart) - new Date(b.dateDepart))
    : situation === 'ARRIVEES'
      ? [...filtrees].sort((a, b) => new Date(a.dateArrivee) - new Date(b.dateArrivee))
      : filtrees;

  // L'onglet des arrivées parle d'arrivées : afficher la date de départ y serait
  // une réponse à une question qu'on ne pose pas.
  const colonneEcheance = situation === 'ARRIVEES' ? 'Arrivée' : 'Départ';

  const departsEnRetard = reservations.filter(estUnDepartDepasse);

  // La réservation ouverte en détail est relue dans la liste à chaque rendu : après
  // une action, la liste est rechargée et le détail se met à jour tout seul — les
  // boutons proposés suivent le nouveau statut sans qu'on ait à les rafraîchir.
  const detail = reservations.find((r) => r.id === idDetail) || null;

  // Les actions possibles dépendent du statut, et de lui seul. Elles sont décrites
  // une fois ici, puis rendues à deux endroits : en icônes sur la ligne, en toutes
  // lettres dans le détail. Impossible que les deux divergent.
  function ActionsReservation({ resa, compact = false }) {
    const actions = [];

    if (resa.resteAPayer > 0 && !['ANNULEE', 'EXPIREE'].includes(resa.statut)) {
      actions.push({
        cle: 'regler', icone: 'regler', ton: 'argent',
        libelle: `Régler ${resa.resteAPayer}`,
        titre: `Encaisser les ${resa.resteAPayer} restants`,
        onClick: () => navigate(`/paiements?reservation=${resa.id}`),
      });
    }

    if (resa.statut === 'EN_ATTENTE') {
      actions.push({
        cle: 'confirmer', icone: 'confirmer', ton: 'entree', principal: true,
        libelle: 'Confirmer', titre: 'Confirmer sans encaisser la totalité',
        enCours: confirmationEnCours === resa.id,
        onClick: () => handleConfirmerReservation(resa),
      });
    }

    if (resa.statut === 'CONFIRMEE') {
      actions.push({
        cle: 'arrivee', icone: 'arrivee', ton: 'entree', principal: true,
        libelle: 'Le client est arrivé', titre: 'Installer le client dans sa chambre',
        enCours: checkInEnCours === resa.id,
        onClick: () => handleCheckIn(resa),
      });
    }

    // Le report de dates reste offert après confirmation tant que le client n'est
    // pas attendu dans la journée : c'est le cas courant du client qui rappelle
    // pour décaler son arrivée.
    if (peutChangerLesDates(resa)) {
      actions.push({
        cle: 'modifier', icone: 'modifier', libelle: 'Changer les dates',
        titre: 'Reporter l\'arrivée ou le départ', onClick: () => ouvrirEdition(resa),
      });
    }

    if (resa.statut === 'EN_COURS') {
      actions.push({
        cle: 'sejour', icone: 'sejour', ton: 'sejour', principal: true,
        libelle: 'Voir le séjour', titre: 'Consommations, prolongation, départ',
        onClick: () => { setIdDetail(null); ouvrirGestionSejour(resa); },
      });
    }

    if (['EN_ATTENTE', 'CONFIRMEE'].includes(resa.statut)) {
      actions.push({
        cle: 'annuler', icone: 'annuler', ton: 'danger', libelle: 'Annuler',
        titre: 'Annuler cette réservation', onClick: () => setReservationAAnnuler(resa),
      });
    }

    if (resa.statut === 'ANNULEE') {
      actions.push({
        cle: 'supprimer', icone: 'supprimer', ton: 'danger', libelle: 'Supprimer',
        titre: 'Supprimer définitivement', onClick: () => setReservationASupprimer(resa),
      });
    }

    if (actions.length === 0) {
      return compact ? null : <p style={{ fontSize: 13, color: 'var(--slate)', margin: 0 }}>Aucune action possible sur ce séjour.</p>;
    }

    // Sur la ligne, on ne garde que les deux actions les plus utiles : au-delà, la
    // colonne repasse sur deux lignes et le tableau redevient illisible. Le reste
    // est toujours accessible dans le détail.
    if (compact) {
      return actions.slice(0, 2).map((a) => (
        <BoutonIcone key={a.cle} nom={a.icone} titre={a.titre} ton={a.ton} onClick={a.onClick} disabled={a.enCours} />
      ));
    }

    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {actions.map((a) => (
          <Button
            key={a.cle}
            taille="sm"
            variante={a.ton === 'danger' ? 'danger' : a.principal ? 'primaire' : 'secondaire'}
            enCours={a.enCours}
            title={a.titre}
            onClick={a.onClick}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icone nom={a.icone} taille={15} />
              {a.libelle}
            </span>
          </Button>
        ))}
      </div>
    );
  }

  const chambreChoisie = chambresDisponibles?.find((c) => c.id === Number(chambreId));
  // Fidèle = déjà venu au moins une fois. Ce séjour-ci sera donc au moins le second.
  const clientFidele = clientSaisi.clientId && (clientSaisi.nombreSejours || 0) >= 1;
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
  // La remise déjà accordée sur la réservation : elle sert de proposition par défaut
  // à la prolongation, sans jamais être modifiée par elle.
  const remiseInitiale = reservationDuSejour?.remiseChambrePourcent || 0;

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
      <Toast message={succes} onFermer={() => setSucces('')} />

      {/* Un départ dont l'heure est passée ne doit pas attendre qu'on le cherche :
          il remonte en tête de page, quel que soit l'onglet ouvert. */}
      {departsEnRetard.length > 0 && situation !== 'DEPARTS' && (
        <button
          onClick={() => setSituation('DEPARTS')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
            background: 'var(--danger-bg)', border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-sm)', padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)', cursor: 'pointer', color: 'var(--danger)',
            fontSize: 13.5, fontWeight: 500,
          }}
        >
          <Icone nom="horloge" taille={17} />
          {departsEnRetard.length === 1
            ? `1 client a dépassé son heure de départ : ${nomDuClient(departsEnRetard[0])}, chambre ${departsEnRetard[0].chambre?.numero}.`
            : `${departsEnRetard.length} clients ont dépassé leur heure de départ.`}
          <span style={{ marginLeft: 'auto', textDecoration: 'underline' }}>Voir</span>
        </button>
      )}

      {/* ---------- Rangement par situation ----------
          Tout mélangé, on ne distingue plus ce qui demande une action de ce qui
          est déjà réglé. Chaque onglet correspond à un moment du séjour. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        {SITUATIONS.map(({ cle, label, aide }) => {
          const nombre = filtrerSituation(cle, reservations).length;
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
                  {/* Quatre colonnes. Le mode de tarification, les dates détaillées et
                      le total facturé étaient utiles mais pas vitaux : ils obligeaient
                      à défiler pour atteindre les boutons. Ils sont dans le détail. */}
                  {['Client', 'Chambre', colonneEcheance, 'Reste à payer', 'Statut', ''].map((h) => (
                    <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservationsAffichees.map((resa) => {
                  // Sur l'onglet des arrivées, c'est l'arrivée qui est en jeu.
                  const surArrivees = situation === 'ARRIVEES';
                  const enRetard = surArrivees ? estUneArriveeDepassee(resa) : estUnDepartDepasse(resa);
                  return (
                    <LigneTableau
                      key={resa.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setMessageDetail(null); setIdDetail(resa.id); }}
                    >
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {nomDuClient(resa)}
                      </td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13 }}>
                        {resa.chambre ? `N°${resa.chambre.numero}` : '-'}
                      </td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, whiteSpace: 'nowrap', color: enRetard ? 'var(--danger)' : 'var(--slate)', fontWeight: enRetard ? 600 : 400 }}>
                        {surArrivees ? formaterArrivee(resa) : formaterDepart(resa)}
                        {enRetard && (
                          <span style={{ display: 'block', fontSize: 11, fontWeight: 600 }}>
                            {surArrivees ? 'attendu' : 'dépassé'}
                          </span>
                        )}
                      </td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {resa.statut === 'ANNULEE' || resa.statut === 'EXPIREE'
                          ? <span style={{ color: 'var(--slate-light)', fontWeight: 400 }}>—</span>
                          : resa.resteAPayer > 0
                            ? <span style={{ color: 'var(--danger)' }}>{resa.resteAPayer}</span>
                            : <span style={{ color: 'var(--success)' }}>soldé</span>}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <Badge label={LIBELLE_STATUT[resa.statut] || resa.statut} ton={TON_STATUT_RESERVATION[resa.statut]} />
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <ActionsReservation resa={resa} compact />
                          <Icone nom="detail" taille={14} style={{ color: 'var(--slate-light)', marginLeft: 2 }} />
                        </div>
                      </td>
                    </LigneTableau>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Carte>
      )}

      {/* ---------- Détail d'une réservation ----------
          Ouvert au clic sur la ligne. Il porte tout ce que le tableau n'affiche
          plus, et les mêmes actions qu'en ligne mais nommées en toutes lettres. */}
      <Modal
        ouvert={!!detail}
        onFermer={() => { setIdDetail(null); setMessageDetail(null); }}
        titre={detail ? nomDuClient(detail) : ''}
        largeur={520}
      >
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Badge label={LIBELLE_STATUT[detail.statut] || detail.statut} ton={TON_STATUT_RESERVATION[detail.statut]} />
              {detail.client?.telephone && (
                <span className="mono" style={{ fontSize: 13, color: 'var(--slate)' }}>{detail.client.telephone}</span>
              )}
              {estUnDepartDepasse(detail) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--danger)' }}>
                  <Icone nom="horloge" taille={14} /> Départ dépassé
                </span>
              )}
            </div>

            <div style={{
              background: 'var(--stone)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)',
            }}>
              {[
                ['Chambre', detail.chambre ? `N°${detail.chambre.numero}` : '—', true],
                ['Type', detail.chambre?.typeChambre?.libelle || '—', false],
                ['Mode', detail.modeTarification === 'HORAIRE' ? `Horaire (${detail.nombreHeures} h)` : `Nuitée (${detail.nombreNuits} n)`, false],
                ['Arrivée', new Date(detail.dateArrivee).toLocaleDateString('fr-FR'), true],
                ['Départ', formaterDepart(detail), true],
                ['Réservée le', new Date(detail.dateReservation).toLocaleDateString('fr-FR'), true],
              ].map(([label, valeur, mono]) => (
                <div key={label}>
                  <p style={{ margin: 0, fontSize: 11.5, color: 'var(--slate)' }}>{label}</p>
                  <p className={mono ? 'mono' : undefined} style={{ margin: '2px 0 0', fontSize: 13.5 }}>{valeur}</p>
                </div>
              ))}
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)', fontSize: 13 }}>
              {[
                ['Chambre et prolongations', detail.montantTotal],
                ...(detail.montantConsommations > 0 ? [['Consommations du bar', detail.montantConsommations]] : []),
                ['Total dû', detail.totalDu],
                ['Déjà payé', detail.montantPaye],
              ].map(([label, valeur]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--slate)' }}>{label}</span>
                  <span className="mono">{valeur}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontWeight: 700,
                paddingTop: 8, marginTop: 4, borderTop: '1px solid var(--line)',
                color: detail.resteAPayer > 0 ? 'var(--danger)' : 'var(--success)',
              }}>
                <span>Reste à payer</span>
                <span className="mono">{detail.resteAPayer > 0 ? detail.resteAPayer : 'soldé'}</span>
              </div>

              {(detail.remiseChambrePourcent > 0 || detail.remiseBarPourcent > 0) && (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--success)' }}>
                  Remise fidélité :
                  {detail.remiseChambrePourcent > 0 && ` −${detail.remiseChambrePourcent} % sur la chambre`}
                  {detail.remiseChambrePourcent > 0 && detail.remiseBarPourcent > 0 && ' ·'}
                  {detail.remiseBarPourcent > 0 && ` −${detail.remiseBarPourcent} % au bar`}
                  {detail.remiseMotif && ` (${detail.remiseMotif})`}
                </p>
              )}
            </div>

            {/* Le refus s'explique juste au-dessus du bouton qui l'a provoqué. */}
            {messageDetail && (
              <div className="anim-alerte" style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: 'var(--danger-bg)', borderLeft: '3px solid var(--danger)',
                borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', fontSize: 13,
              }}>
                <Icone nom="annuler" taille={16} style={{ color: 'var(--danger)', marginTop: 1 }} />
                <span style={{ color: 'var(--ink)' }}>{messageDetail}</span>
              </div>
            )}

            <ActionsReservation resa={detail} />
          </div>
        )}
      </Modal>

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

                {/* ---------- Fidélité ----------
                    Proposée seulement si le client est déjà venu, et jamais cochée
                    d'avance : c'est un geste commercial décidé au comptoir, pas un
                    barème que le logiciel applique tout seul. */}
                {clientFidele && (
                  <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={remiseActive}
                        onChange={(e) => setRemiseActive(e.target.checked)}
                        style={{ marginTop: 3 }}
                      />
                      <span style={{ fontSize: 13.5 }}>
                        <strong>Client fidèle : {clientSaisi.nombreSejours + 1}<sup>e</sup> passage</strong>
                        <br />
                        <span style={{ color: 'var(--slate)' }}>Lui accorder une remise sur ce séjour.</span>
                      </span>
                    </label>

                    {remiseActive && (
                      <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                          <Champ label="Remise chambre (%)">
                            <input
                              type="number" min="0" max="100" placeholder="0"
                              value={remiseChambre}
                              onChange={(e) => setRemiseChambre(e.target.value)}
                              style={styleInput}
                            />
                          </Champ>
                          <Champ label="Remise bar / resto (%)">
                            <input
                              type="number" min="0" max="100" placeholder="0"
                              value={remiseBar}
                              onChange={(e) => setRemiseBar(e.target.value)}
                              style={styleInput}
                            />
                          </Champ>
                        </div>

                        <Champ label="Motif (optionnel)">
                          <input
                            value={remiseMotif}
                            onChange={(e) => setRemiseMotif(e.target.value)}
                            placeholder="ex : client fidèle, geste commercial"
                            style={styleInput}
                          />
                        </Champ>

                        {(Number(remiseChambre) > 0 || Number(remiseBar) > 0) && (
                          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--success)', background: 'var(--success-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
                            {Number(remiseChambre) > 0 && `−${remiseChambre} % sur la chambre, déduits du montant à payer. `}
                            {Number(remiseBar) > 0 && `−${remiseBar} % sur chaque consommation portée sur la chambre pendant le séjour, appliqués automatiquement au bar.`}
                          </p>
                        )}
                      </div>
                    )}
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
            {/* Hiérarchie : l'intitulé est petit et gris, la valeur est sombre et
                appuyée. Tout au même gris clair, l'œil ne sait pas ce qu'il lit. */}
            <div style={{
              background: 'var(--stone)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-4)',
            }}>
              <div>
                <p style={ETIQUETTE}>Entrée</p>
                <p className="mono" style={VALEUR}>{new Date(sejour.dateEntree).toLocaleString('fr-FR')}</p>
              </div>
              <div>
                <p style={ETIQUETTE}>Fin prévue</p>
                <p className="mono" style={{ ...VALEUR, color: departDepasse ? 'var(--danger)' : 'var(--ink)' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <h3 style={TITRE_SECTION}>Consommations du bar</h3>
                <span style={{ fontSize: 11.5, color: 'var(--slate)' }}>saisies au bar</span>
              </div>

              {sejour.consommations.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--slate)', margin: 0 }}>
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

            {/* ---------- Prolongation ----------
                Repliée par défaut, comme la remise de fidélité : la plupart des
                séjours ne sont pas prolongés, et un formulaire toujours ouvert
                encombre l'écran de champs qu'on ne remplira pas.

                Heures ou nuits, quel que soit le mode d'origine : un client arrivé
                pour trois heures peut décider de dormir. C'est sa demande au
                comptoir qui décide, pas la case cochée à la réservation. */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-4)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={prolongationOuverte}
                  onChange={(e) => setProlongationOuverte(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span style={{ fontSize: 13.5 }}>
                  <strong style={{ color: 'var(--ink)' }}>Le client veut prolonger son séjour</strong>
                  <br />
                  <span style={{ color: 'var(--slate)' }}>
                    La date de départ est repoussée d'autant et le supplément s'ajoute à la note.
                  </span>
                </span>
              </label>

              {prolongationOuverte && (
                <form onSubmit={handleProlonger} style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { cle: 'HEURES', label: 'En heures' },
                      { cle: 'NUITS', label: 'En nuits' },
                    ].map(({ cle, label }) => {
                      const actif = uniteProlongation === cle;
                      return (
                        <button
                          key={cle}
                          type="button"
                          onClick={() => setUniteProlongation(cle)}
                          style={{
                            flex: 1, padding: '9px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                            fontSize: 13, fontWeight: actif ? 600 : 500,
                            border: `1.5px solid ${actif ? 'var(--signal)' : 'var(--line-strong)'}`,
                            background: actif ? 'var(--signal-dim-soft)' : 'var(--surface)',
                            color: actif ? 'var(--signal-dark)' : 'var(--slate)',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <Champ label={uniteProlongation === 'HEURES' ? 'Nombre d\'heures' : 'Nombre de nuits'}>
                    <input
                      type="number" min="1"
                      value={uniteProlongation === 'HEURES' ? heuresAAjouter : nuitsAAjouter}
                      onChange={(e) => (uniteProlongation === 'HEURES'
                        ? setHeuresAAjouter(e.target.value)
                        : setNuitsAAjouter(e.target.value))}
                      style={styleInput}
                    />
                  </Champ>

                  {/* ---------- Remise sur la prolongation ----------
                      La prolongation est une négociation à part. Pour un habitué,
                      la case arrive cochée avec sa remise habituelle ; on peut la
                      décocher ou changer le taux. Dans tous les cas, la remise de
                      la réservation d'origine reste intacte. */}
                  <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={remiseProlongationActive}
                        onChange={(e) => setRemiseProlongationActive(e.target.checked)}
                        style={{ marginTop: 3 }}
                      />
                      <span style={{ fontSize: 13 }}>
                        <strong style={{ color: 'var(--ink)' }}>
                          {remiseInitiale > 0
                            ? `Ce client a déjà une remise de ${remiseInitiale} %`
                            : 'Appliquer une remise à cette prolongation'}
                        </strong>
                        <br />
                        <span style={{ color: 'var(--slate)' }}>
                          {remiseInitiale > 0
                            ? 'L\'appliquer aussi à la prolongation ? Décochez pour la facturer au prix plein.'
                            : 'Facultatif, et sans effet sur la réservation d\'origine.'}
                        </span>
                      </span>
                    </label>

                    {remiseProlongationActive && (
                      <div style={{ marginTop: 'var(--space-3)' }}>
                        <Champ label="Remise sur la prolongation (%)">
                          <input
                            type="number" min="1" max="100"
                            value={remiseProlongation}
                            onChange={(e) => setRemiseProlongation(e.target.value)}
                            style={styleInput}
                          />
                        </Champ>
                        {remiseInitiale > 0 && Number(remiseProlongation) !== remiseInitiale && (
                          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--warning)' }}>
                            Différent de sa remise habituelle ({remiseInitiale} %). La réservation
                            d'origine garde bien ses {remiseInitiale} %.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" enCours={prolongationEnCours}>Prolonger le séjour</Button>
                  </div>
                </form>
              )}

              {sejour.heuresSupplementaires?.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <h3 style={TITRE_SECTION}>Heures déjà ajoutées</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {sejour.heuresSupplementaires.map((h) => (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                        <span>+{h.nombreHeures} h ({new Date(h.dateAjout).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})</span>
                        <span className="mono">{h.montant}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13, marginTop: 8 }}>
                    <span>Total heures supplémentaires</span>
                    <span className="mono">{totalHeuresSup.toFixed(2)}</span>
                  </div>
                </div>
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