import { useState, useEffect } from 'react';
import { getUtilisateurs, creerUtilisateur, modifierUtilisateur, attribuerRole, retirerRole } from '../services/utilisateur.service';
import { getRoles } from '../services/role.service';
import Button from '../components/ui/Button';
import Champ, { styleInput } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

export default function Utilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [chargement, setChargement] = useState(true);
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
 async function supprimerUtilisateur(id) {
  await api.delete(`/utilisateurs/${id}`);
}
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
              {utilisateurs.map((u) => {
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
                      <button
                        onClick={() => handleToggleActif(u)}
                        style={{
                          background: u.actif ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: u.actif ? 'var(--success)' : 'var(--danger)',
                          border: 'none', padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                          fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 500,
                        }}
                      >
                        {u.actif ? 'Actif' : 'Inactif'}
                      </button>
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
    </div>
  );
}