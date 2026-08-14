import { useState, useEffect } from 'react';
import {
  getUtilisateurs, creerUtilisateur, modifierUtilisateur, attribuerRole, retirerRole,
  verifierSuppression, telechargerArchive, supprimerUtilisateur,
} from '../services/utilisateur.service';
import { getRoles } from '../services/role.service';
import Button from '../components/ui/Button';
import Alerte from '../components/ui/Alerte';
import Champ, { styleInput } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

export default function Utilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [ongletArchives, setOngletArchives] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  const [modalOuverte, setModalOuverte] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [roleIdsSelectionnes, setRoleIdsSelectionnes] = useState([]);
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState('');

  const [nouveauRoleParUtilisateur, setNouveauRoleParUtilisateur] = useState({});

  const [compteASupprimer, setCompteASupprimer] = useState(null);
  const [archiveTelechargee, setArchiveTelechargee] = useState(false);
  const [telechargementEnCours, setTelechargementEnCours] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  useEffect(() => { chargerDonnees(); }, []);

  async function chargerDonnees() {
    try {
      setChargement(true);
      const [u, r] = await Promise.all([getUtilisateurs(), getRoles()]);
      setUtilisateurs(u);
      setRoles(r);
    } catch (err) {
      setErreur('Impossible de charger les utilisateurs');
    } finally {
      setChargement(false);
    }
  }

  function fermerModal() {
    setModalOuverte(false);
    setNom(''); setPrenom(''); setEmail(''); setMotDePasse(''); setTelephone(''); setRoleIdsSelectionnes([]); setErreurFormulaire('');
  }

  function toggleRoleSelectionne(roleId) {
    setRoleIdsSelectionnes((prev) => prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]);
  }

  async function handleCreer(e) {
    e.preventDefault();
    setErreurFormulaire('');
    setCreationEnCours(true);
    try {
      await creerUtilisateur({ nom, prenom, email, motDePasse, telephone, roleIds: roleIdsSelectionnes });
      fermerModal();
      setSucces('Utilisateur créé avec succès.');
      await chargerDonnees();
    } catch (err) {
      setErreurFormulaire(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setCreationEnCours(false);
    }
  }

  async function handleToggleActif(u) {
    setErreur('');
    try {
      await modifierUtilisateur(u.id, { actif: !u.actif });
      await chargerDonnees();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de la modification');
    }
  }

  async function handleAjouterRole(utilisateurId) {
    const roleId = nouveauRoleParUtilisateur[utilisateurId];
    if (!roleId) return;
    try {
      await attribuerRole(utilisateurId, Number(roleId));
      setNouveauRoleParUtilisateur((prev) => ({ ...prev, [utilisateurId]: '' }));
      await chargerDonnees();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de l\'attribution');
    }
  }

  async function handleRetirerRole(utilisateurId, roleId) {
    try {
      await retirerRole(utilisateurId, roleId);
      await chargerDonnees();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors du retrait');
    }
  }
  // ---------- Suppression d'un compte archivé ----------
  //
  // On télécharge le dossier avant d'effacer : c'est la seule copie qui restera.
  // Le serveur refuse de son côté tout compte ayant tenu une caisse ou vendu au
  // bar — ces recettes ne peuvent pas disparaître avec la personne.
  async function ouvrirSuppression(u) {
    setErreur('');
    setCompteASupprimer({ ...u, inventaire: null });
    setArchiveTelechargee(false);
    try {
      setCompteASupprimer({ ...u, inventaire: await verifierSuppression(u.id) });
    } catch (err) {
      setErreur('Impossible de vérifier ce compte');
      setCompteASupprimer(null);
    }
  }

  async function handleTelechargerArchive() {
    const u = compteASupprimer;
    setTelechargementEnCours(true);
    try {
      const nom = `archive-${u.prenom}-${u.nom}-${u.id}.json`.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
      await telechargerArchive(u.id, nom);
      setArchiveTelechargee(true);
    } catch (err) {
      setErreur('Impossible de télécharger l\'archive');
    } finally {
      setTelechargementEnCours(false);
    }
  }

  async function handleConfirmerSuppression() {
    setSuppressionEnCours(true);
    try {
      const { message } = await supprimerUtilisateur(compteASupprimer.id);
      setCompteASupprimer(null);
      setSucces(message);
      await chargerDonnees();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Suppression impossible');
      setCompteASupprimer(null);
    } finally {
      setSuppressionEnCours(false);
    }
  }

  const actifs = utilisateurs.filter((u) => u.actif);
  const archives = utilisateurs.filter((u) => !u.actif);
  const listeAffichee = ongletArchives ? archives : actifs;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1>Utilisateurs</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>{utilisateurs.length} membre{utilisateurs.length > 1 ? 's' : ''} du personnel</p>
        </div>
        <Button onClick={() => setModalOuverte(true)}>+ Nouvel utilisateur</Button>
      </div>

       {erreur && <Alerte variante="erreur">{erreur}</Alerte>}

      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-4)' }}>
        {[
          { cle: false, label: `En activité (${actifs.length})` },
          { cle: true, label: `Archivés (${archives.length})` },
        ].map(({ cle, label }) => (
          <button
            key={String(cle)}
            onClick={() => setOngletArchives(cle)}
            style={{
              padding: '7px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13,
              fontWeight: ongletArchives === cle ? 600 : 500,
              border: `1px solid ${ongletArchives === cle ? 'var(--moss)' : 'var(--line)'}`,
              background: ongletArchives === cle ? 'var(--moss)' : 'transparent',
              color: ongletArchives === cle ? '#fff' : 'var(--slate)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {chargement ? (
        <p style={{ color: 'var(--slate)' }}>Chargement...</p>
      ) : (
        <Carte padding="0">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                {['Nom', 'Email', 'Rôles', 'Ajouter un rôle', 'Statut'].map((h) => (
                  <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listeAffichee.map((u) => {
                const rolesDisponibles = roles.filter((r) => !u.roles.some((ur) => ur.id === r.id));
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13.5, fontWeight: 500 }}>{u.prenom} {u.nom}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{u.email}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {u.roles.map((role) => (
                          <span key={role.id} style={{
                            background: 'var(--signal-dim)', color: 'var(--moss)', padding: '3px 8px', borderRadius: 20,
                            fontSize: 11, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            {role.libelle}
                            {u.roles.length > 1 && (
                              <button onClick={() => handleRetirerRole(u.id, role.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--moss)', fontWeight: 700, padding: 0, fontSize: 13 }}>×</button>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      {rolesDisponibles.length > 0 && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <select
                            value={nouveauRoleParUtilisateur[u.id] || ''}
                            onChange={(e) => setNouveauRoleParUtilisateur((prev) => ({ ...prev, [u.id]: e.target.value }))}
                            style={{ ...styleInput, height: 30, fontSize: 12 }}
                          >
                            <option value="">-- Rôle --</option>
                            {rolesDisponibles.map((r) => <option key={r.id} value={r.id}>{r.libelle}</option>)}
                          </select>
                          <Button taille="sm" variante="secondaire" onClick={() => handleAjouterRole(u.id)}>+</Button>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleToggleActif(u)}
                          title={u.actif
                            ? 'Archiver ce compte : il ne pourra plus se connecter, son historique est conservé'
                            : 'Réactiver ce compte'}
                          style={{
                            background: u.actif ? 'var(--success-bg)' : 'var(--stone-dim)',
                            color: u.actif ? 'var(--success)' : 'var(--slate)',
                            border: 'none', padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                            fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
                          }}
                        >
                          {u.actif ? 'Archiver' : 'Réactiver'}
                        </button>

                        {/* La suppression n'est offerte qu'aux comptes déjà archivés :
                            l'archivage laisse le temps de constater qu'un compte
                            désactivé ne manque à personne. */}
                        {!u.actif && (
                          <button
                            onClick={() => ouvrirSuppression(u)}
                            title="Télécharger le dossier de ce compte, puis le supprimer définitivement"
                            style={{
                              background: 'var(--danger-bg)', color: 'var(--danger)',
                              border: 'none', padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                              fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
                            }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Carte>
      )}

      {/* ---------- Modal de création ---------- */}
      <Modal ouvert={modalOuverte} onFermer={fermerModal} titre="Nouvel utilisateur">
        <form onSubmit={handleCreer} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="grille-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Champ label="Nom"><input value={nom} onChange={(e) => setNom(e.target.value)} required style={styleInput} /></Champ>
            <Champ label="Prénom"><input value={prenom} onChange={(e) => setPrenom(e.target.value)} required style={styleInput} /></Champ>
          </div>
          <Champ label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styleInput} /></Champ>
          <Champ label="Mot de passe"><input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required style={styleInput} /></Champ>
          <Champ label="Téléphone (optionnel)"><input value={telephone} onChange={(e) => setTelephone(e.target.value)} style={styleInput} /></Champ>

          <Champ label="Rôles">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {roles.map((role) => {
                const selectionne = roleIdsSelectionnes.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRoleSelectionne(role.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer',
                      border: `1px solid ${selectionne ? 'var(--signal)' : 'var(--line)'}`,
                      background: selectionne ? 'var(--signal-dim)' : 'transparent',
                      color: selectionne ? 'var(--moss)' : 'var(--slate)',
                      fontWeight: selectionne ? 600 : 400,
                    }}
                  >
                    {role.libelle}
                  </button>
                );
              })}
            </div>
          </Champ>

          {erreurFormulaire && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{erreurFormulaire}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={fermerModal}>Annuler</Button>
            <Button type="submit" enCours={creationEnCours} disabled={roleIdsSelectionnes.length === 0}>Créer l'utilisateur</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Suppression définitive : archive d'abord ---------- */}
      <Modal
        ouvert={!!compteASupprimer}
        onFermer={() => setCompteASupprimer(null)}
        titre="Supprimer définitivement ce compte"
        largeur={460}
      >
        {compteASupprimer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ fontSize: 13.5, color: 'var(--slate)', margin: 0 }}>
              <strong style={{ color: 'var(--ink)' }}>{compteASupprimer.prenom} {compteASupprimer.nom}</strong>
              {' · '}<span className="mono">{compteASupprimer.email}</span>
            </p>

            {!compteASupprimer.inventaire ? (
              <p style={{ fontSize: 13, color: 'var(--slate)', margin: 0 }}>Vérification du compte...</p>
            ) : !compteASupprimer.inventaire.estSupprimable ? (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)', fontSize: 13 }}>
                <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--danger)' }}>Ce compte ne peut pas être supprimé</p>
                <p style={{ margin: '0 0 10px', color: 'var(--slate)' }}>
                  Il porte {compteASupprimer.inventaire.bloquant.caisses > 0 && `${compteASupprimer.inventaire.bloquant.caisses} caisse(s) tenue(s)`}
                  {compteASupprimer.inventaire.bloquant.caisses > 0 && compteASupprimer.inventaire.bloquant.ventes > 0 && ' et '}
                  {compteASupprimer.inventaire.bloquant.ventes > 0 && `${compteASupprimer.inventaire.bloquant.ventes} vente(s) au bar`}.
                  Les effacer supprimerait des recettes réelles et rendrait la comptabilité invérifiable.
                </p>
                <p style={{ margin: 0, color: 'var(--slate)' }}>
                  Le compte reste archivé : il n'a plus aucun accès à l'application.
                  Vous pouvez tout de même télécharger son dossier.
                </p>
              </div>
            ) : (
              <div style={{ background: 'var(--stone)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)', fontSize: 13 }}>
                <p style={{ margin: '0 0 8px', color: 'var(--slate)' }}>Ce que la suppression détachera, sans le détruire :</p>
                {[
                  ['Encaissements', compteASupprimer.inventaire.detachable.paiements],
                  ['Réservations créées', compteASupprimer.inventaire.detachable.reservations],
                  ['Arrivées enregistrées', compteASupprimer.inventaire.detachable.checkIns],
                  ['Départs enregistrés', compteASupprimer.inventaire.detachable.checkOuts],
                  ['Lignes de journal', compteASupprimer.inventaire.detachable.operations],
                ].filter(([, n]) => n > 0).map(([label, n]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: 'var(--slate)' }}>{label}</span>
                    <span className="mono">{n}</span>
                  </div>
                ))}
                <p style={{ margin: '10px 0 0', color: 'var(--slate-light)', fontSize: 12 }}>
                  Ces opérations restent en base et gardent leur valeur comptable ; elles
                  perdent seulement le nom de leur auteur.
                </p>
              </div>
            )}

            <Button
              variante="secondaire"
              onClick={handleTelechargerArchive}
              enCours={telechargementEnCours}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {archiveTelechargee ? 'Archive téléchargée — retélécharger' : '1. Télécharger l\'archive (JSON)'}
            </Button>

            {compteASupprimer.inventaire?.estSupprimable && (
              <>
                <p style={{ fontSize: 12, color: 'var(--slate-light)', margin: 0 }}>
                  La suppression est irréversible. Le bouton s'active une fois l'archive
                  enregistrée sur votre poste.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                  <Button variante="secondaire" onClick={() => setCompteASupprimer(null)}>Annuler</Button>
                  <Button
                    variante="danger"
                    disabled={!archiveTelechargee}
                    enCours={suppressionEnCours}
                    onClick={handleConfirmerSuppression}
                  >
                    2. Supprimer définitivement
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}