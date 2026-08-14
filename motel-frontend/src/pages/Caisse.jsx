import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getCaissesUtilisateur, ouvrirCaisse, enregistrerMouvement, consulterSolde, fermerCaisse,
} from '../services/caisse.service';
import Button from '../components/ui/Button';
import Champ, { styleInput } from '../components/ui/Champ';
import Carte from '../components/ui/Carte';
import Modal from '../components/ui/Modal';
import Alerte from '../components/ui/Alerte';
import { getRapportJournee } from '../services/recette.service';
import { CONTROLE, aLeRole } from '../config/acces';

const aujourdHui = () => new Date().toISOString().slice(0, 10);

export default function Caisse() {
  const { utilisateur } = useAuth();
  // L'écran ne montrait que sa propre caisse. L'administrateur et le caissier
  // doivent voir l'argent de tous les postes, bar compris, sinon la question
  // « combien est entré ce soir ? » n'a de réponse nulle part.
  const estSuperviseur = aLeRole(utilisateur, CONTROLE);

  const [caisseActive, setCaisseActive] = useState(null);
  const [solde, setSolde] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const [modalOuvertureOuverte, setModalOuvertureOuverte] = useState(false);
  const [soldeInitial, setSoldeInitial] = useState('');
  const [ouvertureEnCours, setOuvertureEnCours] = useState(false);

  const [modalMouvementOuverte, setModalMouvementOuverte] = useState(false);
  const [typeMouvement, setTypeMouvement] = useState('ENTREE');
  const [montantMouvement, setMontantMouvement] = useState('');
  const [motifMouvement, setMotifMouvement] = useState('');
  const [mouvementEnCours, setMouvementEnCours] = useState(false);
  const [erreurMouvement, setErreurMouvement] = useState('');

  const [confirmationFermetureOuverte, setConfirmationFermetureOuverte] = useState(false);
  const [fermetureEnCours, setFermetureEnCours] = useState(false);
  const [montantCompte, setMontantCompte] = useState('');
  const [erreurFermeture, setErreurFermeture] = useState('');
  const [modalRapportOuverte, setModalRapportOuverte] = useState(false);
  const [rapportFermeture, setRapportFermeture] = useState(null);

  // ---------- Vue consolidée (superviseurs) ----------
  const [rapport, setRapport] = useState(null);
  const [dateRapport, setDateRapport] = useState(aujourdHui());
  const [filtrePoste, setFiltrePoste] = useState('TOUS');
  const [chargementRapport, setChargementRapport] = useState(false);

  useEffect(() => { verifierCaisseOuverte(); }, []);

  useEffect(() => {
    if (!estSuperviseur) return;
    let actif = true;
    setChargementRapport(true);
    getRapportJournee(dateRapport)
      .then((r) => { if (actif) setRapport(r); })
      .catch(() => { if (actif) setRapport(null); })
      .finally(() => { if (actif) setChargementRapport(false); });
    return () => { actif = false; };
  }, [estSuperviseur, dateRapport]);

  async function verifierCaisseOuverte() {
    try {
      setChargement(true);
      const caisses = await getCaissesUtilisateur(utilisateur.id);
      const ouverte = caisses.find((c) => c.ouverte);
      if (ouverte) {
        setCaisseActive(ouverte);
        await rafraichirSolde(ouverte.id);
      } else {
        setCaisseActive(null);
      }
    } catch (err) {
      setErreur('Impossible de vérifier l\'état de la caisse');
    } finally {
      setChargement(false);
    }
  }

  async function rafraichirSolde(caisseId) {
    setSolde(await consulterSolde(caisseId));
    const caisses = await getCaissesUtilisateur(utilisateur.id);
    setHistorique(caisses.find((c) => c.id === caisseId)?.mouvements || []);
  }

  async function handleOuvrir(e) {
    e.preventDefault();
    setErreur('');
    setOuvertureEnCours(true);
    try {
      const nouvelleCaisse = await ouvrirCaisse(Number(soldeInitial));
      setCaisseActive(nouvelleCaisse);
      setSoldeInitial('');
      setModalOuvertureOuverte(false);
      await rafraichirSolde(nouvelleCaisse.id);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de l\'ouverture');
    } finally {
      setOuvertureEnCours(false);
    }
  }

  async function handleEnregistrerMouvement(e) {
    e.preventDefault();
    setErreurMouvement('');
    setMouvementEnCours(true);
    try {
      await enregistrerMouvement(caisseActive.id, { type: typeMouvement, montant: Number(montantMouvement), motif: motifMouvement });
      setMontantMouvement(''); setMotifMouvement(''); setModalMouvementOuverte(false);
      await rafraichirSolde(caisseActive.id);
    } catch (err) {
      setErreurMouvement(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setMouvementEnCours(false);
    }
  }

  function ouvrirFermeture() {
    setMontantCompte('');
    setErreurFermeture('');
    setConfirmationFermetureOuverte(true);
  }

  async function handleConfirmerFermeture(e) {
    e.preventDefault();
    setErreurFermeture('');
    setFermetureEnCours(true);
    try {
      const resultat = await fermerCaisse(caisseActive.id, Number(montantCompte));
      setRapportFermeture(resultat.rapport);
      setConfirmationFermetureOuverte(false);
      setModalRapportOuverte(true);
      setCaisseActive(null);
      setSolde(null);
      setHistorique([]);
    } catch (err) {
      setErreurFermeture(err.response?.data?.message || 'Erreur lors de la fermeture');
    } finally {
      setFermetureEnCours(false);
    }
  }

  // Écart affiché en direct pendant la saisie, pour que le caissier voie tout de suite
  // s'il se trompe de montant avant de valider.
  const ecartPrevisionnel = montantCompte === '' || !solde
    ? null
    : Math.round((Number(montantCompte) - solde.soldeCourant) * 100) / 100;

  // ---------- Consolidation : un filtre par rôle tenant une caisse ce jour-là ----------
  const postes = rapport?.postes || [];
  const rolesPresents = [...new Set(postes.flatMap((p) => p.roles))].sort();
  const postesFiltres = filtrePoste === 'TOUS' ? postes : postes.filter((p) => p.roles.includes(filtrePoste));

  // Les mouvements des postes retenus, remis dans l'ordre chronologique inverse :
  // chaque caisse a le sien, mais le superviseur lit une seule journée.
  const mouvementsConsolides = postesFiltres
    .flatMap((p) => p.mouvements.map((m) => ({ ...m, tenuePar: p.tenuePar, roles: p.roles })))
    .sort((a, b) => new Date(b.heure) - new Date(a.heure));

  const totauxFiltres = postesFiltres.reduce(
    (acc, p) => ({ entrees: acc.entrees + p.entrees, sorties: acc.sorties + p.sorties }),
    { entrees: 0, sorties: 0 }
  );

  if (chargement) return <p style={{ color: 'var(--slate)' }}>Chargement...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-5)' }}>Caisse</h1>

        {erreur && <Alerte variante="erreur">{erreur}</Alerte>}
       

      {!caisseActive && (
        <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--slate)', marginBottom: 'var(--space-4)' }}>Aucune caisse ouverte pour le moment.</p>
          <Button onClick={() => setModalOuvertureOuverte(true)} style={{ margin: '0 auto' }}>Ouvrir la caisse</Button>
        </Carte>
      )}

      {caisseActive && solde && (
        <div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <Carte style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0 }}>Solde initial</p>
              <p className="mono" style={{ fontSize: 24, fontWeight: 600, margin: '4px 0 0' }}>{solde.soldeInitial}</p>
            </Carte>
            <Carte style={{ flex: 1, borderColor: 'var(--signal)' }}>
              <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0 }}>Solde courant</p>
              <p className="mono" style={{ fontSize: 24, fontWeight: 600, margin: '4px 0 0', color: 'var(--moss)' }}>{solde.soldeCourant}</p>
            </Carte>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
              <Button onClick={() => setModalMouvementOuverte(true)}>+ Mouvement</Button>
              <Button variante="danger" onClick={ouvrirFermeture}>Fermer la caisse</Button>
            </div>
          </div>

          <h3 style={{ marginBottom: 'var(--space-3)' }}>Historique des mouvements</h3>
          {historique.length === 0 ? (
            <Carte style={{ textAlign: 'center', padding: 'var(--space-6)' }}><p style={{ color: 'var(--slate)' }}>Aucun mouvement enregistré.</p></Carte>
          ) : (
            <Carte padding="0">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    {['Date', 'Type', 'Montant', 'Motif'].map((h) => (
                      <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historique.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{new Date(m.dateMouvement).toLocaleString('fr-FR')}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500, color: m.type === 'ENTREE' ? 'var(--success)' : 'var(--danger)' }}>
                        {m.type === 'ENTREE' ? '↑ Entrée' : '↓ Sortie'}
                      </td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500 }}>{m.montant}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{m.motif || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Carte>
          )}
        </div>
      )}

      {/* ---------- Toutes les caisses (Administrateur / Caissier) ---------- */}
      {estSuperviseur && (
        <div style={{ marginTop: 'var(--space-7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ margin: 0 }}>Tous les postes</h3>
              <p style={{ fontSize: 12.5, color: 'var(--slate)', margin: '4px 0 0' }}>
                Les mouvements de chaque caisse tenue ce jour-là, bar et réception réunis.
              </p>
            </div>
            <Champ label="Journée">
              <input type="date" value={dateRapport} onChange={(e) => setDateRapport(e.target.value)} style={styleInput} />
            </Champ>
          </div>

          {chargementRapport ? (
            <p style={{ color: 'var(--slate)' }}>Chargement du rapport...</p>
          ) : postes.length === 0 ? (
            <Carte style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
              <p style={{ color: 'var(--slate)' }}>Aucune caisse tenue ce jour-là.</p>
            </Carte>
          ) : (
            <>
              {/* Filtre par rôle : « uniquement le bar », « uniquement la réception » */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                {['TOUS', ...rolesPresents].map((cle) => {
                  const actif = filtrePoste === cle;
                  const nombre = cle === 'TOUS' ? postes.length : postes.filter((p) => p.roles.includes(cle)).length;
                  return (
                    <button
                      key={cle}
                      onClick={() => setFiltrePoste(cle)}
                      style={{
                        background: actif ? 'var(--moss)' : 'var(--surface)',
                        color: actif ? '#fff' : 'var(--slate)',
                        border: `1px solid ${actif ? 'var(--moss)' : 'var(--line)'}`,
                        borderRadius: 'var(--radius-sm)', padding: '8px 14px',
                        fontSize: 13, fontWeight: actif ? 600 : 500, cursor: 'pointer',
                      }}
                    >
                      {cle === 'TOUS' ? 'Tous' : cle} <span className="mono" style={{ opacity: 0.7 }}>{nombre}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                <Carte style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0 }}>Entrées</p>
                  <p className="mono" style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 0', color: 'var(--success)' }}>{Math.round(totauxFiltres.entrees * 100) / 100}</p>
                </Carte>
                <Carte style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0 }}>Sorties</p>
                  <p className="mono" style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 0', color: 'var(--danger)' }}>{Math.round(totauxFiltres.sorties * 100) / 100}</p>
                </Carte>
                <Carte style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0 }}>Postes retenus</p>
                  <p className="mono" style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 0' }}>{postesFiltres.length}</p>
                </Carte>
              </div>

              {/* Solde par poste : qui tient quoi, et où en est son tiroir */}
              <Carte padding="0" style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                        {['Poste', 'Rôle', 'État', 'Entrées', 'Sorties', 'Solde théorique', 'Écart'].map((h) => (
                          <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {postesFiltres.map((p) => (
                        <tr key={p.caisseId} style={{ borderBottom: '1px solid var(--line)' }}>
                          <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap' }}>{p.tenuePar}</td>
                          <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--slate)' }}>{p.roles.join(', ') || '-'}</td>
                          <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, fontWeight: 500, color: p.ouverte ? 'var(--warning)' : 'var(--slate)' }}>
                            {p.ouverte ? 'Ouverte' : 'Fermée'}
                          </td>
                          <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--success)' }}>{p.entrees}</td>
                          <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--danger)' }}>{p.sorties}</td>
                          <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 600 }}>{p.soldeTheorique}</td>
                          <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 600, color: p.ecart === null ? 'var(--slate-light)' : p.ecart === 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {p.ecart === null ? 'non fermée' : `${p.ecart > 0 ? '+' : ''}${p.ecart}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Carte>

              <h3 style={{ margin: 'var(--space-5) 0 var(--space-3)', fontSize: 15 }}>
                Mouvements de la journée <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: 'var(--slate)' }}>{mouvementsConsolides.length}</span>
              </h3>
              {mouvementsConsolides.length === 0 ? (
                <Carte style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                  <p style={{ color: 'var(--slate)' }}>Aucun mouvement pour ce filtre.</p>
                </Carte>
              ) : (
                <Carte padding="0">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                          {['Heure', 'Poste', 'Type', 'Montant', 'Motif'].map((h) => (
                            <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mouvementsConsolides.map((m) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid var(--line)' }}>
                            <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)', whiteSpace: 'nowrap' }}>
                              {new Date(m.heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, whiteSpace: 'nowrap' }}>
                              {m.tenuePar}
                              <span style={{ display: 'block', fontSize: 11, color: 'var(--slate)' }}>{m.roles.join(', ')}</span>
                            </td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500, color: m.type === 'ENTREE' ? 'var(--success)' : 'var(--danger)', whiteSpace: 'nowrap' }}>
                              {m.type === 'ENTREE' ? '↑ Entrée' : '↓ Sortie'}
                            </td>
                            <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500 }}>{m.montant}</td>
                            <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{m.motif || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Carte>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------- Modal ouverture ---------- */}
      <Modal ouvert={modalOuvertureOuverte} onFermer={() => setModalOuvertureOuverte(false)} titre="Ouvrir la caisse" largeur={380}>
        <form onSubmit={handleOuvrir} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Champ label="Solde initial (fond de caisse)">
            <input type="number" step="0.01" value={soldeInitial} onChange={(e) => setSoldeInitial(e.target.value)} required style={styleInput} autoFocus />
          </Champ>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={() => setModalOuvertureOuverte(false)}>Annuler</Button>
            <Button type="submit" enCours={ouvertureEnCours}>Ouvrir</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Modal mouvement ---------- */}
      <Modal ouvert={modalMouvementOuverte} onFermer={() => setModalMouvementOuverte(false)} titre="Nouveau mouvement" largeur={380}>
        <form onSubmit={handleEnregistrerMouvement} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setTypeMouvement('ENTREE')} style={{
              flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              border: `1px solid ${typeMouvement === 'ENTREE' ? 'var(--success)' : 'var(--line)'}`,
              background: typeMouvement === 'ENTREE' ? 'var(--success-bg)' : 'transparent',
              color: typeMouvement === 'ENTREE' ? 'var(--success)' : 'var(--slate)', fontWeight: 500, fontSize: 13,
            }}>↑ Entrée</button>
            <button type="button" onClick={() => setTypeMouvement('SORTIE')} style={{
              flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              border: `1px solid ${typeMouvement === 'SORTIE' ? 'var(--danger)' : 'var(--line)'}`,
              background: typeMouvement === 'SORTIE' ? 'var(--danger-bg)' : 'transparent',
              color: typeMouvement === 'SORTIE' ? 'var(--danger)' : 'var(--slate)', fontWeight: 500, fontSize: 13,
            }}>↓ Sortie</button>
          </div>

          <Champ label="Montant"><input type="number" step="0.01" value={montantMouvement} onChange={(e) => setMontantMouvement(e.target.value)} required style={styleInput} /></Champ>
          <Champ label="Motif"><input value={motifMouvement} onChange={(e) => setMotifMouvement(e.target.value)} placeholder="ex: Paiement chambre 101" style={styleInput} /></Champ>

          {erreurMouvement && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{erreurMouvement}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={() => setModalMouvementOuverte(false)}>Annuler</Button>
            <Button type="submit" enCours={mouvementEnCours}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Fermeture : comptage physique du tiroir ---------- */}
      <Modal ouvert={confirmationFermetureOuverte} onFermer={() => setConfirmationFermetureOuverte(false)} titre="Fermer la caisse" largeur={400}>
        <form onSubmit={handleConfirmerFermeture} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ fontSize: 13, color: 'var(--slate)', margin: 0 }}>
            Comptez l'argent réellement présent dans le tiroir et saisissez le montant.
            L'écart avec le solde théorique sera enregistré dans le rapport.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: 'var(--space-3)', background: 'var(--stone)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ color: 'var(--slate)' }}>Solde théorique</span>
            <span className="mono" style={{ fontWeight: 600 }}>{solde?.soldeCourant}</span>
          </div>

          <Champ label="Montant réellement compté">
            <input
              type="number" step="0.01" min="0" required autoFocus
              value={montantCompte}
              onChange={(e) => setMontantCompte(e.target.value)}
              style={styleInput}
            />
          </Champ>

          {ecartPrevisionnel !== null && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 600,
              padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
              background: ecartPrevisionnel === 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: ecartPrevisionnel === 0 ? 'var(--success)' : 'var(--danger)',
            }}>
              <span>{ecartPrevisionnel === 0 ? 'Aucun écart' : ecartPrevisionnel < 0 ? 'Manquant' : 'Excédent'}</span>
              <span className="mono">{ecartPrevisionnel > 0 ? '+' : ''}{ecartPrevisionnel}</span>
            </div>
          )}

          {erreurFermeture && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              {erreurFermeture}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variante="secondaire" onClick={() => setConfirmationFermetureOuverte(false)}>Annuler</Button>
            <Button type="submit" variante="danger" enCours={fermetureEnCours}>Fermer la caisse</Button>
          </div>
        </form>
      </Modal>

      {/* ---------- Rapport de fermeture ---------- */}
      <Modal ouvert={modalRapportOuverte} onFermer={() => setModalRapportOuverte(false)} titre="Rapport de fermeture" largeur={420}>
        {rapportFermeture && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Caissier', rapportFermeture.caissier],
              ['Ouverture', new Date(rapportFermeture.dateOuverture).toLocaleString('fr-FR')],
              ['Fermeture', new Date(rapportFermeture.dateFermeture).toLocaleString('fr-FR')],
              ['Solde initial', rapportFermeture.soldeInitial],
              ['Total entrées', rapportFermeture.totalEntrees],
              ['Total sorties', rapportFermeture.totalSorties],
            ].map(([label, valeur]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--slate)' }}>{label}</span>
                <span className="mono">{valeur}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--line)', fontSize: 15, fontWeight: 600 }}>
              <span>Solde théorique</span>
              <span className="mono" style={{ color: 'var(--moss)' }}>{rapportFermeture.soldeFinal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}>
              <span>Montant compté</span>
              <span className="mono">{rapportFermeture.montantCompte}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700,
              padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
              background: rapportFermeture.ecart === 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: rapportFermeture.ecart === 0 ? 'var(--success)' : 'var(--danger)',
            }}>
              <span>{rapportFermeture.ecart === 0 ? 'Aucun écart' : rapportFermeture.ecart < 0 ? 'Manquant' : 'Excédent'}</span>
              <span className="mono">{rapportFermeture.ecart > 0 ? '+' : ''}{rapportFermeture.ecart}</span>
            </div>
            <Button onClick={() => setModalRapportOuverte(false)} style={{ marginTop: 'var(--space-2)', width: '100%', justifyContent: 'center' }}>
              Fermer ce rapport
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}