import { useState, useEffect } from 'react';
import { getServices, creerService, modifierService, supprimerService } from '../services/service.service';
import Button from '../components/ui/Button';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import ModalConfirmation from '../components/ui/ModalConfirmation';
import Alerte from '../components/ui/Alerte';

const CATEGORIES = [
  { valeur: 'RESTAURANT', label: 'Restaurant' },
  { valeur: 'MINIBAR', label: 'Minibar' },
  { valeur: 'BLANCHISSERIE', label: 'Blanchisserie' },
  { valeur: 'AUTRE', label: 'Autre' },
];

const LABEL_CATEGORIE = Object.fromEntries(CATEGORIES.map((c) => [c.valeur, c.label]));

export default function Services() {
  const [services, setServices] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  const [modalOuverte, setModalOuverte] = useState(false);
  const [serviceEnEdition, setServiceEnEdition] = useState(null);
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('AUTRE');
  const [prix, setPrix] = useState('');
  const [description, setDescription] = useState('');
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');

  const [serviceASupprimer, setServiceASupprimer] = useState(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => { chargerServices(); }, []);

  async function chargerServices() {
    try {
      setChargement(true);
      setErreur('');
      setServices(await getServices());
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de charger les services');
    } finally {
      setChargement(false);
    }
  }

  function ouvrirCreation() {
    setServiceEnEdition(null);
    setNom(''); setCategorie('AUTRE'); setPrix(''); setDescription('');
    setErreurFormulaire('');
    setModalOuverte(true);
  }

  function ouvrirEdition(service) {
    setServiceEnEdition(service);
    setNom(service.nom);
    setCategorie(service.categorie || 'AUTRE');
    setPrix(String(service.prix));
    setDescription(service.description || '');
    setErreurFormulaire('');
    setModalOuverte(true);
  }

  function fermerModal() {
    setModalOuverte(false);
    setErreurFormulaire('');
  }

  async function handleSoumettre(e) {
    e.preventDefault();
    setErreurFormulaire('');
    setSucces('');
    setEnregistrementEnCours(true);
    try {
      const payload = { nom, categorie, prix: Number(prix), description };
      if (serviceEnEdition) {
        await modifierService(serviceEnEdition.id, payload);
        setSucces('Service mis à jour.');
      } else {
        await creerService(payload);
        setSucces('Service créé.');
      }
      fermerModal();
      await chargerServices();
    } catch (err) {
      setErreurFormulaire(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setEnregistrementEnCours(false);
    }
  }

  async function handleConfirmerSuppression() {
    setSuppressionEnCours(true);
    try {
      await supprimerService(serviceASupprimer.id);
      setServiceASupprimer(null);
      await chargerServices();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la suppression');
      setServiceASupprimer(null);
    } finally {
      setSuppressionEnCours(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1>Services supplémentaires</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>
            Petit-déjeuner, blanchisserie, restaurant, minibar... — {services.length} article{services.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={ouvrirCreation}>+ Nouveau service</Button>
      </div>

      {erreur && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="erreur">{erreur}</Alerte></div>}
      {succes && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="succes">{succes}</Alerte></div>}

      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : services.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>Aucun service enregistré.</p>
        </Carte>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
          {services.map((s) => (
            <Carte key={s.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{s.nom}</p>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--slate)',
                  background: 'var(--stone-dim)', padding: '2px 8px', borderRadius: 12, whiteSpace: 'nowrap',
                }}>
                  {LABEL_CATEGORIE[s.categorie] || s.categorie}
                </span>
              </div>

              <p className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--signal-dark)', margin: '0 0 8px' }}>{s.prix}</p>

              {s.description && <p style={{ fontSize: 12.5, color: 'var(--slate)', margin: '0 0 12px' }}>{s.description}</p>}

              <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <Button variante="secondaire" taille="sm" onClick={() => ouvrirEdition(s)} style={{ flex: 1, justifyContent: 'center' }}>Modifier</Button>
                <Button variante="danger" taille="sm" onClick={() => setServiceASupprimer(s)} style={{ flex: 1, justifyContent: 'center' }}>Supprimer</Button>
              </div>
            </Carte>
          ))}
        </div>
      )}

      {/* ---------- Modal création / édition ---------- */}
      <Modal ouvert={modalOuverte} onFermer={fermerModal} titre={serviceEnEdition ? 'Modifier le service' : 'Nouveau service'}>
        <form onSubmit={handleSoumettre} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Champ label="Nom">
            <input value={nom} onChange={(e) => setNom(e.target.value)} required style={styleInput} {...focusHandlers} placeholder="ex: Petit-déjeuner" />
          </Champ>

          <Champ label="Catégorie">
            <select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={styleInput}>
              {CATEGORIES.map((c) => <option key={c.valeur} value={c.valeur}>{c.label}</option>)}
            </select>
          </Champ>

          <Champ label="Prix">
            <input type="number" step="0.01" min="0" value={prix} onChange={(e) => setPrix(e.target.value)} required style={styleInput} {...focusHandlers} />
          </Champ>

          <Champ label="Description (optionnel)">
            <input value={description} onChange={(e) => setDescription(e.target.value)} style={styleInput} {...focusHandlers} />
          </Champ>

          {erreurFormulaire && <Alerte variante="erreur">{erreurFormulaire}</Alerte>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={fermerModal}>Annuler</Button>
            <Button type="submit" enCours={enregistrementEnCours}>{serviceEnEdition ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>

      <ModalConfirmation
        ouvert={!!serviceASupprimer}
        onFermer={() => setServiceASupprimer(null)}
        onConfirmer={handleConfirmerSuppression}
        titre="Supprimer le service"
        message={serviceASupprimer ? `Supprimer "${serviceASupprimer.nom}" ? Impossible si déjà consommé ou vendu.` : ''}
        texteConfirmer="Supprimer"
        enCours={suppressionEnCours}
      />
    </div>
  );
}