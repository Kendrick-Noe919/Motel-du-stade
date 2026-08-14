import { useState, useEffect } from 'react';
import { getTypesChambre, creerTypeChambre, modifierTypeChambre, supprimerTypeChambre } from '../services/typeChambre.service';
import Button from '../components/ui/Button';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import ModalConfirmation from '../components/ui/ModalConfirmation';

export default function TypesChambre() {
  const [types, setTypes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [modalOuverte, setModalOuverte] = useState(false);
  const [typeEnEdition, setTypeEnEdition] = useState(null);
  const [libelle, setLibelle] = useState('');
  const [prixParNuit, setPrixParNuit] = useState('');
  const [capacite, setCapacite] = useState('');
  const [description, setDescription] = useState('');
  const [prixPremiereHeure, setPrixPremiereHeure] = useState('');
  const [prixHeureSupplementaire, setPrixHeureSupplementaire] = useState('');
  const [promo, setPromo] = useState('');
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');

  const [typeASupprimer, setTypeASupprimer] = useState(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => { chargerTypes(); }, []);

  async function chargerTypes() {
    try {
      setChargement(true);
      setTypes(await getTypesChambre());
    } catch (err) {
      setErreur('Impossible de charger les types de chambre');
    } finally {
      setChargement(false);
    }
  }

  function ouvrirCreation() {
    setTypeEnEdition(null);
    setLibelle(''); setPrixParNuit(''); setCapacite(''); setDescription('');
    setPrixPremiereHeure(''); setPrixHeureSupplementaire(''); setPromo('');
    setErreurFormulaire('');
    setModalOuverte(true);
  }

  function ouvrirEdition(type) {
    setTypeEnEdition(type);
    setLibelle(type.libelle);
    setPrixParNuit(String(type.prixParNuit));
    setCapacite(String(type.capacite));
    setDescription(type.description || '');
    setPrixPremiereHeure(type.prixPremiereHeure != null ? String(type.prixPremiereHeure) : '');
    setPrixHeureSupplementaire(type.prixHeureSupplementaire != null ? String(type.prixHeureSupplementaire) : '');
    setPromo(type.promo != null ? String(type.promo) : '');
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
    setEnregistrementEnCours(true);
    try {
      const payload = {
        libelle,
        prixParNuit: Number(prixParNuit),
        capacite: Number(capacite),
        description,
        prixPremiereHeure: Number(prixPremiereHeure),
        // Vide = on facture l'heure supplémentaire au prix de la première
        prixHeureSupplementaire: prixHeureSupplementaire === '' ? Number(prixPremiereHeure) : Number(prixHeureSupplementaire),
        promo: promo === '' ? null : Number(promo),
      };
      if (typeEnEdition) {
        await modifierTypeChambre(typeEnEdition.id, payload);
      } else {
        await creerTypeChambre(payload);
      }
      fermerModal();
      await chargerTypes();
    } catch (err) {
      setErreurFormulaire(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setEnregistrementEnCours(false);
    }
  }

  async function handleConfirmerSuppression() {
    setSuppressionEnCours(true);
    try {
      await supprimerTypeChambre(typeASupprimer.id);
      setTypeASupprimer(null);
      await chargerTypes();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la suppression');
      setTypeASupprimer(null);
    } finally {
      setSuppressionEnCours(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1>Types de chambre</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>Catalogue et tarification</p>
        </div>
        <Button onClick={ouvrirCreation}>+ Nouveau type</Button>
      </div>

       {/* {erreur && <Alerte variante="erreur">{erreur}</Alerte>} */}

      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : types.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>Aucun type de chambre enregistré.</p>
        </Carte>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          {types.map((type) => (
            <Carte key={type.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{type.libelle}</p>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--slate)',
                  background: 'var(--stone-dim)', padding: '2px 8px', borderRadius: 12,
                }}>
                  {type._count?.chambres || 0} chambre{(type._count?.chambres || 0) > 1 ? 's' : ''}
                </span>
              </div>

              <p className="mono" style={{ fontSize: 22, fontWeight: 600, color: 'var(--signal)', margin: '4px 0' }}>
                {type.prixParNuit} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--slate)' }}>/ nuit</span>
              </p>

              {/* Les deux tarifications sont visibles côte à côte : c'est la première
                  chose qu'on vient vérifier sur cet écran. */}
              <p className="mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--moss)', margin: '0 0 4px' }}>
                {type.prixPremiereHeure ?? '-'} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--slate)' }}>/ 1re heure</span>
                {type.prixHeureSupplementaire != null && Number(type.prixHeureSupplementaire) !== Number(type.prixPremiereHeure) && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--slate)' }}>
                    {' '}puis {type.prixHeureSupplementaire}
                  </span>
                )}
              </p>

              {type.prixPremiereHeure == null && (
                <p style={{ fontSize: 12, color: 'var(--danger)', margin: '0 0 4px', fontWeight: 500 }}>
                  Tarif horaire absent : la réservation à l'heure échouera sur ce type.
                </p>
              )}

              {type.promo != null && Number(type.promo) > 0 && (
                <p style={{ fontSize: 12, color: 'var(--warning)', margin: '0 0 4px', fontWeight: 600 }}>
                  Remise permanente de {type.promo} %
                </p>
              )}

              <p style={{ fontSize: 12.5, color: 'var(--slate)', margin: '4px 0 12px' }}>
                Capacité : {type.capacite} personne{type.capacite > 1 ? 's' : ''}
              </p>

              {type.description && (
                <p style={{ fontSize: 12.5, color: 'var(--slate)', margin: '0 0 12px', lineHeight: 1.5 }}>{type.description}</p>
              )}

              <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <Button variante="secondaire" taille="sm" onClick={() => ouvrirEdition(type)} style={{ flex: 1, justifyContent: 'center' }}>
                  Modifier
                </Button>
                <Button variante="danger" taille="sm" onClick={() => setTypeASupprimer(type)} style={{ flex: 1, justifyContent: 'center' }}>
                  Supprimer
                </Button>
              </div>
            </Carte>
          ))}
        </div>
      )}

      {/* ---------- Modal création / édition ---------- */}
      <Modal ouvert={modalOuverte} onFermer={fermerModal} titre={typeEnEdition ? 'Modifier le type de chambre' : 'Nouveau type de chambre'}>
        <form onSubmit={handleSoumettre} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Champ label="Libellé">
            <input value={libelle} onChange={(e) => setLibelle(e.target.value)} required style={styleInput} {...focusHandlers} placeholder="ex: Chambre Standard" />
          </Champ>

          <div className="grille-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Champ label="Prix par nuit">
              <input type="number" step="0.01" value={prixParNuit} onChange={(e) => setPrixParNuit(e.target.value)} required style={styleInput} {...focusHandlers} />
            </Champ>
            <Champ label="Capacité (personnes)">
              <input type="number" min="1" value={capacite} onChange={(e) => setCapacite(e.target.value)} required style={styleInput} {...focusHandlers} />
            </Champ>
          </div>

          {/* Le tarif horaire est indispensable : sans lui, toute réservation à l'heure
              sur ce type échoue au calcul du montant. */}
          <div className="grille-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Champ label="Prix de la première heure">
              <input
                type="number" step="0.01" min="1" required
                value={prixPremiereHeure}
                onChange={(e) => setPrixPremiereHeure(e.target.value)}
                style={styleInput} {...focusHandlers} placeholder="ex: 5000"
              />
            </Champ>
            <Champ label="Prix de l'heure supplémentaire">
              <input
                type="number" step="0.01" min="0"
                value={prixHeureSupplementaire}
                onChange={(e) => setPrixHeureSupplementaire(e.target.value)}
                style={styleInput} {...focusHandlers}
                placeholder={prixPremiereHeure || 'identique à la première'}
              />
            </Champ>
          </div>
          <p style={{ fontSize: 12, color: 'var(--slate)', margin: '-8px 0 0' }}>
            Laissée vide, l'heure supplémentaire est facturée au prix de la première.
          </p>

          <Champ label="Remise permanente (optionnel)">
            <input
              type="number" step="0.01" min="0" max="100"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              style={styleInput} {...focusHandlers} placeholder="en %, ex: 10"
            />
          </Champ>

          <Champ label="Description (optionnel)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ ...styleInput, height: 'auto', padding: 12, resize: 'vertical', fontFamily: 'var(--font-body)' }}
              {...focusHandlers}
            />
          </Champ>

          {erreurFormulaire && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              {erreurFormulaire}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={fermerModal}>Annuler</Button>
            <Button type="submit" enCours={enregistrementEnCours}>{typeEnEdition ? 'Enregistrer' : 'Créer le type'}</Button>
          </div>
        </form>
      </Modal>

      <ModalConfirmation
        ouvert={!!typeASupprimer}
        onFermer={() => setTypeASupprimer(null)}
        onConfirmer={handleConfirmerSuppression}
        titre="Supprimer le type de chambre"
        message={typeASupprimer ? `Supprimer "${typeASupprimer.libelle}" ? ${typeASupprimer._count?.chambres > 0 ? `Attention : ${typeASupprimer._count.chambres} chambre(s) utilisent encore ce type.` : 'Cette action est irréversible.'}` : ''}
        texteConfirmer="Supprimer"
        enCours={suppressionEnCours}
      />
    </div>
  );
}