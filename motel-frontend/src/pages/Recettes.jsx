import { useState, useEffect, useCallback } from 'react';
import { getRecettes, getRapportJournee } from '../services/recette.service';
import SelecteurPeriode, { bornesPeriode } from '../components/SelecteurPeriode';
import Carte from '../components/ui/Carte';
import Button from '../components/ui/Button';
import Alerte from '../components/ui/Alerte';
import BarresComparees, { TEINTES } from '../components/ui/BarresComparees';
import PartsDuTotal from '../components/ui/PartsDuTotal';

const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')}`;

function Ligne({ label, valeur, fort, ton }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '8px 0', borderBottom: '1px solid var(--line)',
      fontSize: fort ? 15 : 13.5, fontWeight: fort ? 700 : 500,
    }}>
      <span style={{ color: fort ? 'var(--ink)' : 'var(--slate)' }}>{label}</span>
      <span className="mono" style={{ color: ton || (fort ? 'var(--moss)' : 'var(--ink)') }}>{fcfa(valeur)}</span>
    </div>
  );
}

export default function Recettes() {
  const [periode, setPeriode] = useState(() => ({ cle: 'jour', ...bornesPeriode('jour') }));
  const [recettes, setRecettes] = useState(null);
  const [rapport, setRapport] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const [r, j] = await Promise.all([
        getRecettes(periode.debut.toISOString(), periode.fin.toISOString()),
        getRapportJournee(periode.fin.toISOString().slice(0, 10)).catch(() => null),
      ]);
      setRecettes(r);
      setRapport(j);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de charger les recettes');
    } finally {
      setChargement(false);
    }
  }, [periode]);

  useEffect(() => { charger(); }, [charger]);

  return (
    <div>
      <div className="sans-impression" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1>Recettes</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, margin: '4px 0 0' }}>
            Du {periode.debut.toLocaleDateString('fr-FR')} au {periode.fin.toLocaleDateString('fr-FR')}
          </p>
        </div>
        <Button variante="secondaire" onClick={() => window.print()}>Imprimer</Button>
      </div>

      <div className="sans-impression">
        <SelecteurPeriode valeur={periode.cle} onChanger={setPeriode} />
      </div>

      {erreur && <Alerte variante="erreur">{erreur}</Alerte>}
      {chargement && <p style={{ color: 'var(--slate)' }}>Chargement...</p>}

      {recettes && !chargement && (
        <>
          {/* ---------- Cumul ---------- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            {[
              ['Hébergement', recettes.cumul.hebergement, 'var(--moss)', null],
              ['Bar et services', recettes.cumul.bar, 'var(--moss)', null],
              ['Remboursements', -recettes.cumul.remboursements, 'var(--danger)', null],
              ['Recette nette', recettes.cumul.recetteNette, 'var(--signal-dark)', null],
              // Le stock d'impayés ne dépend pas de la période : c'est ce qui est
              // facturé et pas encore rentré, à la date d'aujourd'hui.
              ['Reste à encaisser', recettes.creances?.total, 'var(--danger)',
                recettes.creances?.nombre
                  ? `${recettes.creances.nombre} réservation${recettes.creances.nombre > 1 ? 's' : ''}`
                    + (recettes.creances.clientsPartis > 0 ? ` · dont ${fcfa(recettes.creances.clientsPartis)} de clients déjà partis` : '')
                  : 'Tout est encaissé'],
            ].map(([label, valeur, couleur, note]) => (
              <Carte key={label}>
                <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0 }}>{label}</p>
                <p className="mono" style={{ fontSize: 23, fontWeight: 700, margin: '4px 0 0', color: couleur }}>
                  {fcfa(valeur)}
                </p>
                {note && <p style={{ fontSize: 11, color: 'var(--slate)', margin: '4px 0 0' }}>{note}</p>}
              </Carte>
            ))}
          </div>

          {/* ---------- Résumé visuel : départements et rôles ---------- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <Carte>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Par département</h3>
              <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 'var(--space-4)' }}>
                La part de chacun dans ce qui est entré en caisse. Une nuitée et un jus
                ne se comparent pas ; leur poids dans le total, si.
              </p>
              <PartsDuTotal
                formater={fcfa}
                libelleTotal="Encaissé sur la période"
                vide="Rien d'encaissé sur la période."
                parts={[
                  {
                    label: 'Chambres',
                    valeur: recettes.departements?.chambres.encaisse,
                    couleur: TEINTES[0],
                    detail: `${recettes.departements?.chambres.nombreOperations || 0} encaissement(s)`,
                  },
                  {
                    label: 'Bar et restaurant',
                    valeur: recettes.departements?.bar.encaisse,
                    couleur: TEINTES[1],
                    detail: `${fcfa(recettes.departements?.bar.ventesComptoir)} au comptoir`
                          + ` · ${fcfa(recettes.departements?.bar.surNotesEncaisse)} sur notes de chambre`,
                  },
                ]}
              />

              <p style={{ fontSize: 11.5, color: 'var(--slate-light)', margin: 'var(--space-3) 0 0' }}>
                Quand la réception encaisse une note, la part consommée au bar est
                comptée au bar, au prorata de la note.
              </p>

              {/* Le bar porté sur les notes de chambre est facturé mais pas encore
                  encaissé : le mêler aux barres ci-dessus donnerait un total faux. */}
              {recettes.departements?.bar.surNotesChambre > 0 && (
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--slate)' }}>Bar porté sur les notes de chambre</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{fcfa(recettes.departements.bar.surNotesChambre)}</span>
                  </div>
                  <p style={{ fontSize: 11.5, color: 'var(--slate-light)', margin: '4px 0 0' }}>
                    Facturé sur la période, encaissé au départ du client avec sa note de chambre.
                    Chiffre d'affaires total du bar : {fcfa(recettes.departements.bar.genere)}.
                  </p>
                </div>
              )}
            </Carte>

            <Carte>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Par rôle</h3>
              <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 'var(--space-4)' }}>
                Qui fait entrer l'argent, et pour quelle part. Un agent cumulant plusieurs
                rôles forme sa propre ligne.
              </p>
              <PartsDuTotal
                formater={fcfa}
                libelleTotal="Encaissé sur la période"
                vide="Aucun encaissement sur la période."
                parts={(recettes.parRole || []).map((r, i) => ({
                  label: r.role,
                  valeur: r.total,
                  couleur: TEINTES[i % TEINTES.length],
                  detail: `hébergement ${fcfa(r.hebergement)} · bar ${fcfa(r.bar)}`,
                }))}
              />
            </Carte>

            <Carte>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Détail du bar</h3>
              <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 'var(--space-4)' }}>
                Ventes au comptoir, par catégorie de service.
              </p>
              <BarresComparees
                formater={fcfa}
                vide="Aucune vente au comptoir sur la période."
                series={[
                  { label: 'Restauration', valeur: recettes.bar.RESTAURANT },
                  { label: 'Minibar', valeur: recettes.bar.MINIBAR },
                  { label: 'Blanchisserie', valeur: recettes.bar.BLANCHISSERIE },
                  { label: 'Autres', valeur: recettes.bar.AUTRE },
                ]}
              />
            </Carte>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {/* ---------- Détail hébergement ---------- */}
            <Carte>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Hébergement</h3>
              <Ligne label="Nuitées" valeur={recettes.hebergement.nuitee} />
              <Ligne label="À l'heure" valeur={recettes.hebergement.horaire} />
              <Ligne label="Total" valeur={recettes.cumul.hebergement} fort />
              <p style={{ fontSize: 12, color: 'var(--slate-light)', margin: '10px 0 0' }}>
                {recettes.hebergement.nombrePaiements} encaissement{recettes.hebergement.nombrePaiements > 1 ? 's' : ''}
              </p>
            </Carte>

            {/* ---------- Détail bar ---------- */}
            <Carte>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Bar et services</h3>
              <Ligne label="Restauration" valeur={recettes.bar.RESTAURANT} />
              <Ligne label="Minibar" valeur={recettes.bar.MINIBAR} />
              <Ligne label="Blanchisserie" valeur={recettes.bar.BLANCHISSERIE} />
              <Ligne label="Autres" valeur={recettes.bar.AUTRE} />
              <Ligne label="Total" valeur={recettes.cumul.bar} fort />
              <p style={{ fontSize: 12, color: 'var(--slate-light)', margin: '10px 0 0' }}>
                {recettes.bar.nombreVentes} vente{recettes.bar.nombreVentes > 1 ? 's' : ''}
              </p>
            </Carte>

            {/* ---------- Par personne ---------- */}
            <Carte>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Par personne</h3>
              {recettes.parPersonne.length === 0
                ? <p style={{ color: 'var(--slate)', fontSize: 13 }}>Aucun encaissement sur la période.</p>
                : recettes.parPersonne.map((p) => (
                    <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 600 }}>
                        <span>{p.nom}</span>
                        <span className="mono">{fcfa(p.total)}</span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--slate)' }}>
                        hébergement {fcfa(p.hebergement)} · bar {fcfa(p.bar)}
                      </p>
                    </div>
                  ))}
            </Carte>

            {/* ---------- Sorties de caisse ---------- */}
            <Carte>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Sorties de caisse</h3>
              {recettes.sorties.length === 0
                ? <p style={{ color: 'var(--slate)', fontSize: 13 }}>Aucune sortie sur la période.</p>
                : recettes.sorties.map((s, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--slate)' }}>{s.motif || 'Sans motif'}</span>
                        <span className="mono" style={{ color: 'var(--danger)', fontWeight: 600 }}>{fcfa(s.montant)}</span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--slate-light)' }}>
                        {new Date(s.date).toLocaleString('fr-FR')}{s.par ? ` · ${s.par}` : ''}
                      </p>
                    </div>
                  ))}
            </Carte>
          </div>

          {/* ---------- Rapprochement des caisses ---------- */}
          {rapport && rapport.postes.length > 0 && (
            <Carte style={{ marginTop: 'var(--space-5)' }}>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Rapprochement des caisses</h3>
              <p style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 'var(--space-4)' }}>
                Ce que le système a enregistré, face à ce qui a été compté dans chaque tiroir.
              </p>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line-strong)', textAlign: 'left' }}>
                      {['Poste', 'État', 'Entrées', 'Sorties', 'Théorique', 'Compté', 'Écart'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', fontSize: 11.5, color: 'var(--slate)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rapport.postes.map((p) => (
                      <tr key={p.caisseId} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 600 }}>{p.tenuePar}</td>
                        <td style={{ padding: '9px 12px', color: p.ouverte ? 'var(--warning)' : 'var(--slate)' }}>
                          {p.ouverte ? 'Ouverte' : 'Fermée'}
                        </td>
                        <td className="mono" style={{ padding: '9px 12px' }}>{fcfa(p.entrees)}</td>
                        <td className="mono" style={{ padding: '9px 12px' }}>{fcfa(p.sorties)}</td>
                        <td className="mono" style={{ padding: '9px 12px' }}>{fcfa(p.soldeTheorique)}</td>
                        <td className="mono" style={{ padding: '9px 12px' }}>
                          {p.montantCompte === null ? '-' : fcfa(p.montantCompte)}
                        </td>
                        <td className="mono" style={{
                          padding: '9px 12px', fontWeight: 700,
                          color: p.ecart === null ? 'var(--slate-light)' : p.ecart === 0 ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {p.ecart === null ? '-' : `${p.ecart > 0 ? '+' : ''}${fcfa(p.ecart)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rapport.caissesNonFermees.length > 0 && (
                <p style={{ marginTop: 'var(--space-3)', fontSize: 12.5, color: 'var(--warning)' }}>
                  Caisse encore ouverte : {rapport.caissesNonFermees.join(', ')}. L'écart ne peut être calculé qu'après fermeture.
                </p>
              )}
            </Carte>
          )}
        </>
      )}
    </div>
  );
}
