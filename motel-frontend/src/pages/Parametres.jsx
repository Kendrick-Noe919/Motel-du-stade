import { useState, useEffect } from 'react';
import { getRoles, creerRole, supprimerRole } from '../services/role.service';
import {
  getParametres, modifierParametre, getReglagesNotifications, basculerNotification,
} from '../services/parametre.service';
import Button from '../components/ui/Button';
import Alerte from '../components/ui/Alerte';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import ModalConfirmation from '../components/ui/ModalConfirmation';

// Les codes de rôle sont techniques : l'écran affiche des intitulés lisibles.
const LIBELLE_ROLE = {
  ADMIN: 'Administration',
  STANDARDISTE: 'Réception',
  CAISSIER: 'Caisse',
  BARMAN: 'Bar',
};

export default function Parametres() {
  const [roles, setRoles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [modalOuverte, setModalOuverte] = useState(false);
  const [libelle, setLibelle] = useState('');
  const [description, setDescription] = useState('');
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');

  const [roleASupprimer, setRoleASupprimer] = useState(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const [parametres, setParametres] = useState([]);
  const [valeursSaisies, setValeursSaisies] = useState({});
  const [succesParametre, setSuccesParametre] = useState('');

  // ---------- Notifications ----------
  const [reglages, setReglages] = useState([]);
  const [basculeEnCours, setBasculeEnCours] = useState(null);

  useEffect(() => { chargerRoles(); chargerParametres(); chargerReglages(); }, []);

  async function chargerParametres() {
    try {
      setParametres(await getParametres());
    } catch {
      setErreur('Impossible de charger les paramètres');
    }
  }

  async function chargerReglages() {
    try {
      setReglages(await getReglagesNotifications());
    } catch {
      setErreur('Impossible de charger les réglages de notification');
    }
  }

  async function handleBasculer(type, actif) {
    setBasculeEnCours(type);
    setErreur('');
    try {
      await basculerNotification(type, actif);
      // Mise à jour locale plutôt que rechargement complet : la bascule doit
      // répondre instantanément sous le doigt.
      setReglages((liste) => liste.map((r) => (r.type === type ? { ...r, actif } : r)));
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de modifier ce réglage');
    } finally {
      setBasculeEnCours(null);
    }
  }

  async function handleEnregistrerParametre(cle) {
    setErreur('');
    setSuccesParametre('');
    try {
      await modifierParametre(cle, Number(valeursSaisies[cle]));
      await chargerParametres();
      setValeursSaisies((v) => { const copie = { ...v }; delete copie[cle]; return copie; });
      setSuccesParametre('Réglage enregistré. Il s\'applique dès maintenant.');
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  }

  async function chargerRoles() {
    try {
      setChargement(true);
      setRoles(await getRoles());
    } catch (err) {
      setErreur('Impossible de charger les rôles');
    } finally {
      setChargement(false);
    }
  }

  function fermerModal() {
    setModalOuverte(false);
    setLibelle(''); setDescription(''); setErreurFormulaire('');
  }

  async function handleCreer(e) {
    e.preventDefault();
    setErreurFormulaire('');
    setCreationEnCours(true);
    try {
      await creerRole({ libelle, description });
      fermerModal();
      await chargerRoles();
    } catch (err) {
      setErreurFormulaire(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setCreationEnCours(false);
    }
  }

  async function handleConfirmerSuppression() {
    setSuppressionEnCours(true);
    try {
      await supprimerRole(roleASupprimer.id);
      setRoleASupprimer(null);
      await chargerRoles();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la suppression');
      setRoleASupprimer(null);
    } finally {
      setSuppressionEnCours(false);
    }
  }

  return (
    <div>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 'var(--space-5)' }}>
        Configuration générale du système et gestion des rôles du personnel.
      </p>

      {/* ---------- Réglages du fonctionnement ---------- */}
      <Carte style={{ marginBottom: 'var(--space-5)' }}>
        <h3 style={{ marginBottom: 'var(--space-2)' }}>Règles de réservation</h3>
        <p style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 'var(--space-4)' }}>
          Ces délais s'appliquent immédiatement, sans redémarrage.
        </p>

        {parametres.length === 0 ? (
          <p style={{ color: 'var(--slate)', fontSize: 13 }}>Chargement...</p>
        ) : parametres.map((p) => (
          <div key={p.cle} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)',
            padding: 'var(--space-3) 0', borderBottom: '1px solid var(--line)',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500 }}>{p.libelle}</p>
              {p.description && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--slate)', maxWidth: '60ch' }}>{p.description}</p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <input
                type="number" min="0" step="1"
                value={valeursSaisies[p.cle] ?? p.valeur}
                onChange={(e) => setValeursSaisies((v) => ({ ...v, [p.cle]: e.target.value }))}
                style={{ ...styleInput, width: 80, height: 34, fontSize: 13, textAlign: 'right' }}
              />
              <span style={{ fontSize: 12.5, color: 'var(--slate)', minWidth: 44 }}>{p.unite}</span>
              <Button
                taille="sm"
                variante="secondaire"
                disabled={String(valeursSaisies[p.cle] ?? p.valeur) === String(p.valeur)}
                onClick={() => handleEnregistrerParametre(p.cle)}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        ))}

        {succesParametre && (
          <p style={{ marginTop: 'var(--space-3)', fontSize: 13, color: 'var(--success)' }}>{succesParametre}</p>
        )}
      </Carte>

      <Carte>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3>Rôles du système</h3>
          <Button taille="sm" onClick={() => setModalOuverte(true)}>+ Nouveau rôle</Button>
        </div>

          {erreur && <Alerte variante="erreur">{erreur}</Alerte>}
        

        {chargement ? (
          <p style={{ color: 'var(--slate)', fontSize: 13 }}>Chargement...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {roles.map((role) => (
              <div key={role.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500 }}>{role.libelle}</p>
                  {role.description && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--slate)' }}>{role.description}</p>}
                </div>
                <Button variante="danger" taille="sm" onClick={() => setRoleASupprimer(role)}>Supprimer</Button>
              </div>
            ))}
          </div>
        )}
      </Carte>

      <Modal ouvert={modalOuverte} onFermer={fermerModal} titre="Nouveau rôle" largeur={400}>
        <form onSubmit={handleCreer} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Champ label="Libellé"><input value={libelle} onChange={(e) => setLibelle(e.target.value)} required style={styleInput} {...focusHandlers} placeholder="ex: Superviseur" /></Champ>
          <Champ label="Description (optionnel)"><input value={description} onChange={(e) => setDescription(e.target.value)} style={styleInput} {...focusHandlers} /></Champ>

          {erreurFormulaire && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{erreurFormulaire}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={fermerModal}>Annuler</Button>
            <Button type="submit" enCours={creationEnCours}>Créer</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Notifications ----------
          Un interrupteur par type. La liste vient du catalogue du serveur : un
          type ajouté au code apparaît ici sans migration ni saisie préalable. */}
      <Carte style={{ marginTop: 'var(--space-6)' }}>
        <h3 style={{ marginBottom: 4 }}>Notifications</h3>
        <p style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 'var(--space-5)' }}>
          Ce que chaque poste reçoit dans sa cloche. Couper un type n'efface pas les
          notifications déjà envoyées.
        </p>

        {reglages.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--slate)' }}>Chargement des réglages...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {[...new Set(reglages.map((r) => r.groupe))].map((groupe) => (
              <div key={groupe}>
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--slate)', margin: '0 0 10px',
                }}>
                  {groupe}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {reglages.filter((r) => r.groupe === groupe).map((r) => (
                    <label
                      key={r.type}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={r.actif}
                        disabled={basculeEnCours === r.type}
                        onChange={(e) => handleBasculer(r.type, e.target.checked)}
                      />
                      <span style={{ flex: 1 }}>
                        <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{r.libelle}</span>
                        <br />
                        <span style={{ fontSize: 11.5, color: 'var(--slate)' }}>
                          Reçue par : {r.destinataires.map((d) => LIBELLE_ROLE[d] || d).join(', ')}
                        </span>
                      </span>
                      {!r.parDefaut && !r.actif && (
                        <span style={{ fontSize: 11, color: 'var(--slate-light)' }}>éteint d'origine</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Carte>

      <ModalConfirmation
        ouvert={!!roleASupprimer}
        onFermer={() => setRoleASupprimer(null)}
        onConfirmer={handleConfirmerSuppression}
        titre="Supprimer le rôle"
        message={roleASupprimer ? `Supprimer le rôle "${roleASupprimer.libelle}" ? Impossible si des utilisateurs l'ont encore attribué.` : ''}
        texteConfirmer="Supprimer"
        enCours={suppressionEnCours}
      />
    </div>
  );
}