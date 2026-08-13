import { useState, useEffect } from 'react';
import { getTypesChambre } from '../services/typeChambre.service';
import Button from '../components/ui/Button';
import Champ, { styleInput } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import Badge, { TON_ETAT_CHAMBRE } from '../components/ui/Badge';
import { getChambres, creerChambre, changerEtatChambre, modifierChambre, supprimerChambre } from '../services/chambre.service';
import ModalConfirmation from '../components/ui/ModalConfirmation';

const ETATS = ['DISPONIBLE', 'OCCUPEE', 'MAINTENANCE', 'NETTOYAGE'];

export default function Chambres() {
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1>Chambres</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>
            {chambres.length} chambre{chambres.length > 1 ? 's' : ''} enregistrée{chambres.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={ouvrirCreation}>+ Nouvelle chambre</Button>
      </div>

        {erreur && <Alerte variante="erreur">{erreur}</Alerte>}
     

      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : chambres.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>Aucune chambre enregistrée pour le moment.</p>
        </Carte>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          {chambres.map((chambre) => (
            <Carte key={chambre.id} padding="0">
              <div style={{ height: 4, background: `var(--${chambre.etat === 'DISPONIBLE' ? 'signal' : chambre.etat === 'OCCUPEE' ? 'danger' : chambre.etat === 'MAINTENANCE' ? 'warning' : 'info'})` }} />
              <div style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p className="mono" style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>N°{chambre.numero}</p>
                    <p style={{ fontSize: 12, color: 'var(--slate)', margin: '2px 0 0' }}>
                      {chambre.etage != null ? `Étage ${chambre.etage}` : 'Rez-de-chaussée'}
                    </p>
                  </div>
                  <Badge label={chambre.etat} ton={TON_ETAT_CHAMBRE[chambre.etat]} />
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{chambre.typeChambre.libelle}</p>
                  <p className="mono" style={{ fontSize: 13, color: 'var(--slate)', margin: '2px 0 0' }}>
                    {chambre.typeChambre.prixParNuit} / nuit
                  </p>
                </div>

                <select
                  value={chambre.etat}
                  onChange={(e) => handleChangerEtat(chambre.id, e.target.value)}
                  style={{ ...styleInput, height: 34, fontSize: 12.5, width: '100%', marginBottom: 8 }}
                >
                  {ETATS.map((etat) => <option key={etat} value={etat}>{etat}</option>)}
                </select>

                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variante="secondaire" taille="sm" onClick={() => ouvrirEdition(chambre)} style={{ flex: 1, justifyContent: 'center' }}>
                    Modifier
                  </Button>
                  <Button variante="danger" taille="sm" onClick={() => setChambreASupprimer(chambre)} style={{ flex: 1, justifyContent: 'center' }}>
                    Supprimer
                  </Button>
                </div>
              </div>
            </Carte>
          ))}
        </div>
      )}

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