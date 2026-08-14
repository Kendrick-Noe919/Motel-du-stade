import { useState, useEffect } from 'react';
import {
  getClients, rechercherClients, inscrireClient, enregistrerClientRapide,
  getHistoriqueClient, modifierClient, supprimerClient,
} from '../services/client.service';
import { useDebounce } from '../hooks/useDebounce';
import Button from '../components/ui/Button';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import ModalConfirmation from '../components/ui/ModalConfirmation';
import Alerte from '../components/ui/Alerte';
import Badge, { TON_STATUT_RESERVATION } from '../components/ui/Badge';

const LABEL_SEXE = { M: 'Homme', F: 'Femme' };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [recherche, setRecherche] = useState('');
  const rechercheDebounced = useDebounce(recherche);

  // ---------- Création / édition ----------
  const [modalOuverte, setModalOuverte] = useState(false);
  const [clientEnEdition, setClientEnEdition] = useState(null);
  const [modeCreation, setModeCreation] = useState('rapide'); // 'rapide' | 'complet'
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [sexe, setSexe] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [adresse, setAdresse] = useState('');
  const [numeroPiece, setNumeroPiece] = useState('');
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');

  // ---------- Historique ----------
  const [clientSelectionne, setClientSelectionne] = useState(null);
  const [historique, setHistorique] = useState(null);

  // ---------- Suppression ----------
  const [clientASupprimer, setClientASupprimer] = useState(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => {
    chargerClients();
  }, [rechercheDebounced]);

  async function chargerClients() {
    try {
      setChargement(true);
      setErreur('');
      const data = rechercheDebounced ? await rechercherClients(rechercheDebounced) : await getClients();
      setClients(data);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de charger les clients');
    } finally {
      setChargement(false);
    }
  }

  function resetFormulaire() {
    setNom(''); setPrenom(''); setSexe(''); setTelephone('');
    setEmail(''); setMotDePasse(''); setAdresse(''); setNumeroPiece('');
    setErreurFormulaire('');
  }

  function ouvrirCreation() {
    setClientEnEdition(null);
    setModeCreation('rapide');
    resetFormulaire();
    setModalOuverte(true);
  }

  function ouvrirEdition(client) {
    setClientEnEdition(client);
    setNom(client.nom || ''); setPrenom(client.prenom || ''); setSexe(client.sexe || '');
    setTelephone(client.telephone || ''); setAdresse(client.adresse || ''); setNumeroPiece(client.numeroPiece || '');
    setEmail(''); setMotDePasse('');
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

    if (!telephone.trim()) {
      setErreurFormulaire('Le téléphone est obligatoire');
      return;
    }

    setEnregistrementEnCours(true);
    try {
      if (clientEnEdition) {
        await modifierClient(clientEnEdition.id, {
          nom, prenom, sexe: sexe || null, telephone, adresse, numeroPiece,
        });
        setSucces('Client mis à jour.');
      } else if (modeCreation === 'complet') {
        await inscrireClient({ nom, prenom, sexe: sexe || null, telephone, email, motDePasse, adresse, numeroPiece });
        setSucces('Client inscrit avec succès.');
      } else {
        await enregistrerClientRapide({ nom, prenom, sexe: sexe || null, telephone });
        setSucces('Client enregistré.');
      }
      fermerModal();
      await chargerClients();
    } catch (err) {
      setErreurFormulaire(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setEnregistrementEnCours(false);
    }
  }

  async function handleVoirHistorique(client) {
    setClientSelectionne(client);
    setHistorique(null);
    try {
      const data = await getHistoriqueClient(client.id);
      setHistorique(data.reservations);
    } catch (err) {
      setErreur('Impossible de charger l\'historique');
    }
  }

  async function handleConfirmerSuppression() {
    setSuppressionEnCours(true);
    try {
      await supprimerClient(clientASupprimer.id);
      setClientASupprimer(null);
      setSucces('Client supprimé.');
      await chargerClients();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la suppression');
      setClientASupprimer(null);
    } finally {
      setSuppressionEnCours(false);
    }
  }

  const nomComplet = (c) => [c.prenom, c.nom].filter(Boolean).join(' ') || '(sans nom)';
  const labelSexe = { M: 'Homme', F: 'Femme' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1>Clients</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>
            {clients.length} client{clients.length > 1 ? 's' : ''} enregistré{clients.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={ouvrirCreation}>+ Nouveau client</Button>
      </div>

      {erreur && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="erreur">{erreur}</Alerte></div>}
      {succes && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="succes">{succes}</Alerte></div>}

      <input
        placeholder="Rechercher un client (nom, prénom, email)..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        style={{ ...styleInput, width: '100%', maxWidth: 400, marginBottom: 'var(--space-4)' }}
        {...focusHandlers}
      />

      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : clients.length === 0 ? (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)' }}>Aucun client trouvé.</p>
        </Carte>
      ) : (
        <Carte padding="0">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  {['Client', 'Sexe', 'Téléphone', 'Email', 'Adresse', 'Pièce ID', 'Inscrit le', ''].map((h) => (
                    <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {nomComplet(client)}
                      {!client.email && (
                        <span style={{ marginLeft: 6 }}><Badge label="Passage" ton="neutre" /></span>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>
                      {labelSexe[client.sexe] || '-'}
                    </td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, whiteSpace: 'nowrap' }}>{client.telephone}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{client.email || '-'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{client.adresse || '-'}</td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--slate)' }}>{client.numeroPiece || '-'}</td>
                    <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--slate)', whiteSpace: 'nowrap' }}>
                      {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Button variante="secondaire" taille="sm" onClick={() => handleVoirHistorique(client)}>Historique</Button>
                        <Button variante="secondaire" taille="sm" onClick={() => ouvrirEdition(client)}>Modifier</Button>
                        <Button variante="danger" taille="sm" onClick={() => setClientASupprimer(client)}>Supprimer</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>
      )}

      {/* ---------- Modal création / édition ---------- */}
      <Modal ouvert={modalOuverte} onFermer={fermerModal} titre={clientEnEdition ? `Modifier ${nomComplet(clientEnEdition)}` : 'Nouveau client'} largeur={480}>
        {!clientEnEdition && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-5)' }}>
            <button type="button" onClick={() => setModeCreation('rapide')} style={{
              flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              border: `1.5px solid ${modeCreation === 'rapide' ? 'var(--signal)' : 'var(--line)'}`,
              background: modeCreation === 'rapide' ? 'var(--signal-dim-soft)' : 'transparent',
              color: modeCreation === 'rapide' ? 'var(--signal-dark)' : 'var(--slate)',
            }}>
              Client de passage
            </button>
            <button type="button" onClick={() => setModeCreation('complet')} style={{
              flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              border: `1.5px solid ${modeCreation === 'complet' ? 'var(--signal)' : 'var(--line)'}`,
              background: modeCreation === 'complet' ? 'var(--signal-dim-soft)' : 'transparent',
              color: modeCreation === 'complet' ? 'var(--signal-dark)' : 'var(--slate)',
            }}>
              Compte en ligne
            </button>
          </div>
        )}

        <form onSubmit={handleSoumettre} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="grille-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Champ label="Nom (optionnel)"><input value={nom} onChange={(e) => setNom(e.target.value)} style={styleInput} {...focusHandlers} /></Champ>
            <Champ label="Prénom (optionnel)"><input value={prenom} onChange={(e) => setPrenom(e.target.value)} style={styleInput} {...focusHandlers} /></Champ>
          </div>

          <div className="grille-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Champ label="Sexe (optionnel)">
              <select value={sexe} onChange={(e) => setSexe(e.target.value)} style={styleInput}>
                <option value="">Non précisé</option>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
              </select>
            </Champ>
            <Champ label="Téléphone">
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)} required style={styleInput} {...focusHandlers} placeholder="ex: 771234567" />
            </Champ>
          </div>

          {!clientEnEdition && modeCreation === 'complet' && (
            <>
              <Champ label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styleInput} {...focusHandlers} /></Champ>
              <Champ label="Mot de passe" hint="6 caractères minimum">
                <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required style={styleInput} {...focusHandlers} />
              </Champ>
            </>
          )}

          {clientEnEdition && (
            <p style={{ fontSize: 12, color: 'var(--slate-light)', margin: 0 }}>
              {clientEnEdition.email ? `Compte : ${clientEnEdition.email} (non modifiable ici)` : 'Client de passage, aucun compte en ligne'}
            </p>
          )}

          <Champ label="Adresse (optionnel)"><input value={adresse} onChange={(e) => setAdresse(e.target.value)} style={styleInput} {...focusHandlers} /></Champ>
          <Champ label="Numéro de pièce d'identité (optionnel)"><input value={numeroPiece} onChange={(e) => setNumeroPiece(e.target.value)} style={styleInput} {...focusHandlers} /></Champ>

          {erreurFormulaire && <Alerte variante="erreur">{erreurFormulaire}</Alerte>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={fermerModal}>Annuler</Button>
            <Button type="submit" enCours={enregistrementEnCours}>{clientEnEdition ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Modal d'historique ---------- */}
      <Modal
        ouvert={!!clientSelectionne}
        onFermer={() => setClientSelectionne(null)}
        titre={clientSelectionne ? `Historique de ${nomComplet(clientSelectionne)}` : ''}
        largeur={560}
      >
        {historique === null ? (
          <p style={{ color: 'var(--slate)' }}>Chargement de l'historique...</p>
        ) : historique.length === 0 ? (
          <p style={{ color: 'var(--slate)' }}>Aucune réservation pour ce client.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {historique.map((resa) => (
              <div key={resa.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500 }}>
                    {resa.chambre ? `Chambre ${resa.chambre.numero}` : 'Chambre supprimée'}
                  </p>
                  <p className="mono" style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--slate)' }}>
                    {new Date(resa.dateArrivee).toLocaleDateString('fr-FR')} → {new Date(resa.dateDepart).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge label={resa.statut} ton={TON_STATUT_RESERVATION[resa.statut]} />
                  <p className="mono" style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500 }}>{resa.montantTotal}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ModalConfirmation
        ouvert={!!clientASupprimer}
        onFermer={() => setClientASupprimer(null)}
        onConfirmer={handleConfirmerSuppression}
        titre="Supprimer le client"
        message={clientASupprimer ? `Supprimer définitivement ${nomComplet(clientASupprimer)} ? Cette action est irréversible.` : ''}
        texteConfirmer="Supprimer"
        enCours={suppressionEnCours}
      />
    </div>
  );
}