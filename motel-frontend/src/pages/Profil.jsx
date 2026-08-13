import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMonProfil, modifierMonProfil, changerMotDePasse } from '../services/auth.service';
import Button from '../components/ui/Button';
import Champ, { styleInput, focusHandlers } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Badge from '../components/ui/Badge';

export default function Profil() {
  const { mettreAJourUtilisateur } = useAuth();

  const [profil, setProfil] = useState(null);
  const [chargement, setChargement] = useState(true);

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [erreurInfos, setErreurInfos] = useState('');
  const [succesInfos, setSuccesInfos] = useState('');

  const [motDePasseActuel, setMotDePasseActuel] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [changementEnCours, setChangementEnCours] = useState(false);
  const [erreurMotDePasse, setErreurMotDePasse] = useState('');
  const [succesMotDePasse, setSuccesMotDePasse] = useState('');

  useEffect(() => {
    getMonProfil().then((data) => {
      setProfil(data);
      setNom(data.nom); setPrenom(data.prenom); setTelephone(data.telephone || '');
    }).finally(() => setChargement(false));
  }, []);

  async function handleEnregistrerInfos(e) {
    e.preventDefault();
    setErreurInfos(''); setSuccesInfos('');
    setEnregistrementEnCours(true);
    try {
      const maj = await modifierMonProfil({ nom, prenom, telephone });
      mettreAJourUtilisateur({ nom: maj.nom, prenom: maj.prenom });
      setSuccesInfos('Informations mises à jour.');
    } catch (err) {
      setErreurInfos(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setEnregistrementEnCours(false);
    }
  }

  async function handleChangerMotDePasse(e) {
    e.preventDefault();
    setErreurMotDePasse(''); setSuccesMotDePasse('');

    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setErreurMotDePasse('La confirmation ne correspond pas au nouveau mot de passe');
      return;
    }

    setChangementEnCours(true);
    try {
      await changerMotDePasse(motDePasseActuel, nouveauMotDePasse);
      setSuccesMotDePasse('Mot de passe modifié avec succès.');
      setMotDePasseActuel(''); setNouveauMotDePasse(''); setConfirmationMotDePasse('');
    } catch (err) {
      setErreurMotDePasse(err.response?.data?.message || 'Erreur lors du changement');
    } finally {
      setChangementEnCours(false);
    }
  }

  if (chargement) return <p style={{ color: 'var(--slate)' }}>Chargement du profil...</p>;

  return (
    <div className="grille-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
      {/* ---------- Informations personnelles ---------- */}
      <Carte>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Informations personnelles</h3>

        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)' }}>
          {profil.roles.map((r) => <Badge key={r.id} label={r.libelle} ton="signal" />)}
        </div>

        <form onSubmit={handleEnregistrerInfos} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Champ label="Email"><input value={profil.email} disabled style={{ ...styleInput, background: 'var(--stone-dim)', color: 'var(--slate)' }} /></Champ>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <Champ label="Nom"><input value={nom} onChange={(e) => setNom(e.target.value)} required style={styleInput} {...focusHandlers} /></Champ>
            <Champ label="Prénom"><input value={prenom} onChange={(e) => setPrenom(e.target.value)} required style={styleInput} {...focusHandlers} /></Champ>
          </div>
          <Champ label="Téléphone"><input value={telephone} onChange={(e) => setTelephone(e.target.value)} style={styleInput} {...focusHandlers} /></Champ>

          {erreurInfos && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{erreurInfos}</div>}
          {succesInfos && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{succesInfos}</div>}

          <Button type="submit" enCours={enregistrementEnCours} style={{ alignSelf: 'flex-start' }}>Enregistrer</Button>
        </form>
      </Carte>

      {/* ---------- Sécurité ---------- */}
      <Carte>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Sécurité</h3>
        <form onSubmit={handleChangerMotDePasse} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Champ label="Mot de passe actuel">
            <input type="password" value={motDePasseActuel} onChange={(e) => setMotDePasseActuel(e.target.value)} required style={styleInput} {...focusHandlers} />
          </Champ>
          <Champ label="Nouveau mot de passe" hint="6 caractères minimum">
            <input type="password" value={nouveauMotDePasse} onChange={(e) => setNouveauMotDePasse(e.target.value)} required style={styleInput} {...focusHandlers} />
          </Champ>
          <Champ label="Confirmer le nouveau mot de passe">
            <input type="password" value={confirmationMotDePasse} onChange={(e) => setConfirmationMotDePasse(e.target.value)} required style={styleInput} {...focusHandlers} />
          </Champ>

          {erreurMotDePasse && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{erreurMotDePasse}</div>}
          {succesMotDePasse && <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{succesMotDePasse}</div>}

          <Button type="submit" variante="secondaire" enCours={changementEnCours} style={{ alignSelf: 'flex-start' }}>Changer le mot de passe</Button>
        </form>
      </Carte>
    </div>
  );
}