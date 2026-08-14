import { useState, useEffect } from 'react';
import { getTypesChambre } from '../services/typeChambre.service';
import Button from '../components/ui/Button';
import Champ, { styleInput } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import Badge, { TON_ETAT_CHAMBRE, TONS, libelleEtat } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { aLeRole, SEUL_ADMIN } from '../config/acces';
import { getChambres, creerChambre, changerEtatChambre, modifierChambre, supprimerChambre } from '../services/chambre.service';
import ModalConfirmation from '../components/ui/ModalConfirmation';
import Alerte from '../components/ui/Alerte';

// OCCUPEE n'est pas proposé : cet état est posé par le check-in et levé par le
// check-out. Le sélecteur reste affiché en lecture quand la chambre est occupée.
const ETATS_MANUELS = ['DISPONIBLE', 'NETTOYAGE', 'MAINTENANCE', 'HORS_SERVICE'];

// OCCUPEE vient du check-in, RESERVEE de la confirmation d'une réservation :
// ni l'un ni l'autre ne se change à la main.
const ETATS_AUTOMATIQUES = ['OCCUPEE', 'RESERVEE'];

const ETATS_FILTRE = ['DISPONIBLE', 'RESERVEE', 'OCCUPEE', 'NETTOYAGE', 'MAINTENANCE', 'HORS_SERVICE'];

// Groupe les chambres par type, en ne gardant que celles qui passent le filtre d'état.
// Un type dont plus aucune chambre ne correspond disparaît de la liste.
function grouperParType(chambres, filtreEtat) {
  const groupes = new Map();
  for (const chambre of chambres) {
    if (filtreEtat !== 'TOUS' && chambre.etat !== filtreEtat) continue;
    const libelle = chambre.typeChambre?.libelle || 'Sans type';
    if (!groupes.has(libelle)) groupes.set(libelle, []);
    groupes.get(libelle).push(chambre);
  }
  return [...groupes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([libelle, chambresDuType]) => ({
      libelle,
      chambresDuType,
      disponibles: chambresDuType.filter((c) => c.etat === 'DISPONIBLE').length,
    }));
}

// Éclaircit une couleur vers le blanc. `pourcent` est la part de teinte gardée :
// 12 % donne un lavis à peine coloré, 30 % un trait encore lisible en bordure.
//
// Le mélange se fait en CSS parce que la table des tons ne contient pas des
// hexadécimaux mais des `var(--danger)` : recopier les valeurs ici créerait un
// second jeu de couleurs à maintenir, qui dériverait de la charte au premier
// changement. Les navigateurs sans color-mix retombent sur le fond blanc déclaré
// juste avant, et la carte reste parfaitement lisible.
const versBlanc = (couleur, pourcent) => `color-mix(in srgb, ${couleur} ${pourcent}%, white)`;

// La carte d'une chambre.
//
// L'état se lisait sur un bandeau saturé de 4 px : trop de couleur pour une
// information que le badge donne déjà, et sur une grille de vingt chambres l'œil
// ne voyait plus que ça. La couleur est maintenant répartie sur toute la carte en
// un lavis très clair : l'état se reconnaît de loin, sans qu'aucune zone ne crie.
// Le badge, plus clair que le fond, reste lisible par contraste inversé.
function CarteChambre({ etat, children }) {
  const [survol, setSurvol] = useState(false);
  // Même table que les badges : un état oublié ici prendrait une couleur au hasard.
  const teinte = TONS[TON_ETAT_CHAMBRE[etat]] || TONS.neutre;

  return (
    <div
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      style={{
        // Repli pour les navigateurs sans color-mix : la déclaration suivante est
        // simplement ignorée et la carte reste blanche.
        backgroundColor: 'var(--surface)',
        background: versBlanc(teinte.text, survol ? 18 : 12),
        border: `1px solid ${versBlanc(teinte.text, survol ? 45 : 30)}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: survol ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: survol ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow 0.15s, transform 0.15s, border-color 0.15s, background 0.15s',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

// La pastille d'état, contre le numéro de chambre. Elle lit la même table que les
// badges : un état oublié ici prendrait sinon une couleur au hasard.
function PastilleEtat({ etat }) {
  const teinte = TONS[TON_ETAT_CHAMBRE[etat]] || TONS.neutre;
  return (
    <span
      title={libelleEtat(etat)}
      style={{
        width: 8, height: 8, borderRadius: '50%', background: teinte.text,
        display: 'inline-block', flexShrink: 0,
      }}
    />
  );
}

export default function Chambres() {
  const { utilisateur } = useAuth();
  const peutGererLeParc = aLeRole(utilisateur, SEUL_ADMIN);
  const [filtreEtat, setFiltreEtat] = useState('TOUS');
  const [chambres, setChambres] = useState([]);
  const [typesChambre, setTypesChambre] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [modalOuverte, setModalOuverte] = useState(false);
  const [chambreEnEdition, setChambreEnEdition] = useState(null); // null = création, objet = édition
  const [numero, setNumero] = useState('');
  const [etage, setEtage] = useState('');
  const [typeChambreId, setTypeChambreId] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');

  const [chambreASupprimer, setChambreASupprimer] = useState(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => { chargerDonnees(); }, []);

  async function chargerDonnees() {
    try {
      setChargement(true);
      const [chambresData, typesData] = await Promise.all([getChambres(), getTypesChambre()]);
      setChambres(chambresData);
      setTypesChambre(typesData);
    } catch (err) {
      setErreur('Impossible de charger les chambres');
    } finally {
      setChargement(false);
    }
  }

  function ouvrirCreation() {
    setChambreEnEdition(null);
    setNumero(''); setEtage(''); setTypeChambreId('');
    setModalOuverte(true);
  }

  function ouvrirEdition(chambre) {
    setChambreEnEdition(chambre);
    setNumero(chambre.numero);
    setEtage(chambre.etage ?? '');
    setTypeChambreId(String(chambre.typeChambre.id));
    setModalOuverte(true);
  }

  function fermerModal() {
    setModalOuverte(false);
    setErreurFormulaire('');
  }

  async function handleSoumettre(e) {
    e.preventDefault();
    setErreurFormulaire('');
    setCreationEnCours(true);
    try {
      const payload = { numero, etage: etage || null, typeChambreId: Number(typeChambreId) };
      if (chambreEnEdition) {
        await modifierChambre(chambreEnEdition.id, payload);
      } else {
        await creerChambre(payload);
      }
      fermerModal();
      await chargerDonnees();
    } catch (err) {
      setErreurFormulaire(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setCreationEnCours(false);
    }
  }

  async function handleChangerEtat(id, nouvelEtat) {
    try {
      await changerEtatChambre(id, nouvelEtat);
      await chargerDonnees();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors du changement d\'état');
    }
  }

  async function handleConfirmerSuppression() {
    setSuppressionEnCours(true);
    try {
      await supprimerChambre(chambreASupprimer.id);
      setChambreASupprimer(null);
      await chargerDonnees();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la suppression');
      setChambreASupprimer(null);
    } finally {
      setSuppressionEnCours(false);
    }
  }

  const parCategorie = grouperParType(chambres, filtreEtat);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1>Chambres</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>
            {chambres.length} chambre{chambres.length > 1 ? 's' : ''} enregistrée{chambres.length > 1 ? 's' : ''}
          </p>
        </div>
        {/* Créer une chambre est une décision de gestion : la standardiste consulte
            et change l'état, elle n'agrandit pas le parc. */}
        {peutGererLeParc && <Button onClick={ouvrirCreation}>+ Nouvelle chambre</Button>}
      </div>

        {erreur && <Alerte variante="erreur">{erreur}</Alerte>}

      {/* Filtre par état : « trouver une Standard libre ce soir » doit être immédiat */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        {[{ cle: 'TOUS', label: `Toutes (${chambres.length})` },
          ...ETATS_FILTRE.map((e) => ({ cle: e, label: `${libelleEtat(e)} (${chambres.filter((c) => c.etat === e).length})` }))]
          .map(({ cle, label }) => (
            <button
              key={cle}
              onClick={() => setFiltreEtat(cle)}
              style={{
                padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 12.5,
                fontWeight: filtreEtat === cle ? 600 : 500,
                border: `1px solid ${filtreEtat === cle ? 'var(--moss)' : 'var(--line)'}`,
                background: filtreEtat === cle ? 'var(--moss)' : 'transparent',
                color: filtreEtat === cle ? '#fff' : 'var(--slate)',
              }}
            >
              {label}
            </button>
          ))}
      </div>

      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : chambres.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>Aucune chambre enregistrée pour le moment.</p>
        </Carte>
      ) : parCategorie.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>Aucune chambre dans cet état.</p>
        </Carte>
      ) : parCategorie.map(({ libelle, chambresDuType, disponibles }) => (
        <div key={libelle} style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 'var(--space-3)' }}>
            <h3 style={{ margin: 0 }}>{libelle}</h3>
            <span style={{ fontSize: 12.5, color: 'var(--slate)' }}>
              {chambresDuType.length} chambre{chambresDuType.length > 1 ? 's' : ''}
            </span>
            <span className="mono" style={{
              fontSize: 11, padding: '2px 9px', borderRadius: 12,
              background: disponibles > 0 ? 'var(--success-bg)' : 'var(--stone-dim)',
              color: disponibles > 0 ? 'var(--success)' : 'var(--slate)',
            }}>
              {disponibles} libre{disponibles > 1 ? 's' : ''}
            </span>
          </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          {chambresDuType.map((chambre) => (
            <CarteChambre key={chambre.id} etat={chambre.etat}>
              <div style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p className="mono" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 600, margin: 0 }}>
                      <PastilleEtat etat={chambre.etat} />
                      N°{chambre.numero}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--slate)', margin: '2px 0 0' }}>
                      {chambre.etage != null ? `Étage ${chambre.etage}` : 'Rez-de-chaussée'}
                    </p>
                  </div>
                  <Badge label={libelleEtat(chambre.etat)} ton={TON_ETAT_CHAMBRE[chambre.etat]} />
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{chambre.typeChambre.libelle}</p>
                  <p className="mono" style={{ fontSize: 13, color: 'var(--slate)', margin: '2px 0 0' }}>
                    {chambre.typeChambre.prixParNuit} / nuit
                  </p>
                </div>

                {/* Le sélecteur d'état disparaissait sur le fond teinté : bordure
                    très pâle et fond transparent, il ne se distinguait plus d'un
                    simple texte. Il porte maintenant un fond blanc franc, une
                    bordure marquée et son intitulé, pour se lire comme la commande
                    qu'il est. */}
                {(() => {
                  const verrouille = ETATS_AUTOMATIQUES.includes(chambre.etat);
                  return (
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--slate)', fontWeight: 500, marginBottom: 4 }}>
                        État de la chambre
                      </label>
                      <select
                        value={chambre.etat}
                        disabled={verrouille}
                        title={chambre.etat === 'OCCUPEE'
                          ? 'Chambre occupée : passez par le check-out pour la libérer'
                          : chambre.etat === 'RESERVEE'
                            ? 'Chambre retenue par une réservation confirmée'
                            : 'Changer l\'état de la chambre'}
                        onChange={(e) => handleChangerEtat(chambre.id, e.target.value)}
                        onFocus={(e) => { if (!verrouille) e.target.style.borderColor = 'var(--signal)'; }}
                        onBlur={(e) => { e.target.style.borderColor = verrouille ? 'var(--line)' : 'var(--line-strong)'; }}
                        style={{
                          ...styleInput,
                          height: 38, fontSize: 13, width: '100%',
                          background: verrouille ? 'var(--stone-dim)' : 'var(--surface)',
                          border: `1.5px solid ${verrouille ? 'var(--line)' : 'var(--line-strong)'}`,
                          color: verrouille ? 'var(--slate)' : 'var(--ink)',
                          fontWeight: 500,
                          cursor: verrouille ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {verrouille
                          ? <option value={chambre.etat}>{libelleEtat(chambre.etat)}</option>
                          : ETATS_MANUELS.map((etat) => <option key={etat} value={etat}>{libelleEtat(etat)}</option>)}
                      </select>
                      {verrouille && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--slate-light)' }}>
                          {chambre.etat === 'OCCUPEE'
                            ? 'Libérée au départ du client.'
                            : 'Retenue par une réservation confirmée.'}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {peutGererLeParc && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variante="secondaire" taille="sm" onClick={() => ouvrirEdition(chambre)} style={{ flex: 1, justifyContent: 'center' }}>
                      Modifier
                    </Button>
                    <Button variante="danger" taille="sm" onClick={() => setChambreASupprimer(chambre)} style={{ flex: 1, justifyContent: 'center' }}>
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </CarteChambre>
          ))}
        </div>
        </div>
      ))}

      {/* ---------- Modal création / édition ---------- */}
      <Modal ouvert={modalOuverte} onFermer={fermerModal} titre={chambreEnEdition ? `Modifier la chambre N°${chambreEnEdition.numero}` : 'Nouvelle chambre'}>
        <form onSubmit={handleSoumettre} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Champ label="Numéro">
            <input value={numero} onChange={(e) => setNumero(e.target.value)} required style={styleInput} placeholder="ex: 101" />
          </Champ>
          <Champ label="Étage (optionnel)">
            <input type="number" value={etage} onChange={(e) => setEtage(e.target.value)} style={styleInput} placeholder="ex: 1" />
          </Champ>
          <Champ label="Type de chambre">
            <select value={typeChambreId} onChange={(e) => setTypeChambreId(e.target.value)} required style={styleInput}>
              <option value="">-- Choisir --</option>
              {typesChambre.map((type) => (
                <option key={type.id} value={type.id}>{type.libelle} ({type.prixParNuit} / nuit)</option>
              ))}
            </select>
          </Champ>

          {erreurFormulaire && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              {erreurFormulaire}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={fermerModal}>Annuler</Button>
            <Button type="submit" enCours={creationEnCours}>{chambreEnEdition ? 'Enregistrer' : 'Créer la chambre'}</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Confirmation de suppression ---------- */}
      <ModalConfirmation
        ouvert={!!chambreASupprimer}
        onFermer={() => setChambreASupprimer(null)}
        onConfirmer={handleConfirmerSuppression}
        titre="Supprimer la chambre"
        message={chambreASupprimer ? `Supprimer définitivement la chambre N°${chambreASupprimer.numero} ? Cette action est irréversible.` : ''}
        texteConfirmer="Supprimer"
        enCours={suppressionEnCours}
      />
    </div>
  );
}