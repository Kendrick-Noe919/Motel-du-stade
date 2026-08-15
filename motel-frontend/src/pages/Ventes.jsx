import { useState, useEffect } from 'react';
import { getServices } from '../services/service.service';
import {
  creerVente, getVentes, getChambresOccupees, envoyerSurChambre, getConsommationsSurChambre,
} from '../services/vente.service';
import Button from '../components/ui/Button';
import Carte from '../components/ui/Carte';
import LigneTableau from '../components/ui/LigneTableau';
import Alerte from '../components/ui/Alerte';
import Toast from '../components/ui/Toast';
import Champ, { styleInput } from '../components/ui/Champ';

const CATEGORIES_BAR = ['RESTAURANT', 'MINIBAR'];

// Le point de vente parle la langue du comptoir, pas celle de la base.
const LIBELLE_FAMILLE = {
  TOUT: 'Tout',
  RESTAURANT: 'Cuisine',
  MINIBAR: 'Boissons',
  BLANCHISSERIE: 'Blanchisserie',
  AUTRE: 'Divers',
};

// Sans accents ni casse : chercher « regab » doit trouver « Régab », « braise »
// doit trouver « braisé ». NFD sépare la lettre de son accent, et l'intervalle
// ̀-ͯ (écrit en échappements, pas en caractères invisibles) retire les
// accents ainsi isolés.
export const sansAccents = (texte) => texte
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase();

// Une nuitée se lit en jours, un séjour horaire à l'heure près : afficher « 14/08 »
// à un client parti à 18h ne dirait rien au barman.
function formaterDepart(chambre) {
  const depart = new Date(chambre.dateDepart);
  return chambre.modeTarification === 'HORAIRE'
    ? depart.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : depart.toLocaleDateString('fr-FR');
}

export default function Ventes() {
  const [services, setServices] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [chambresOccupees, setChambresOccupees] = useState([]);
  const [surChambre, setSurChambre] = useState([]);
  const [panier, setPanier] = useState([]); // [{ serviceId, nom, prix, quantite }]
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [encaissementEnCours, setEncaissementEnCours] = useState(false);
  // Au bar on ne paie pas forcément tout de suite : un client logé fait porter
  // sa commande sur sa chambre et règle au départ.
  const [reglement, setReglement] = useState('IMMEDIAT'); // IMMEDIAT | SUR_CHAMBRE
  // Repères de navigation dans la carte, qui compte plusieurs dizaines d'articles.
  const [recherche, setRecherche] = useState('');
  const [familleActive, setFamilleActive] = useState('TOUT');
  const [sejourChoisi, setSejourChoisi] = useState('');

  useEffect(() => { chargerDonnees(); }, []);

  async function chargerDonnees() {
    try {
      setChargement(true);
      const [servicesData, ventesData, chambresData, surChambreData] = await Promise.all([
        getServices(), getVentes(), getChambresOccupees(), getConsommationsSurChambre(),
      ]);
      setServices(servicesData.filter((s) => CATEGORIES_BAR.includes(s.categorie)));
      setHistorique(ventesData.slice(0, 10));
      setChambresOccupees(chambresData);
      setSurChambre(surChambreData);
    } catch (err) {
      setErreur('Impossible de charger le menu');
    } finally {
      setChargement(false);
    }
  }

  function ajouterAuPanier(service) {
    setPanier((prev) => {
      const existant = prev.find((l) => l.serviceId === service.id);
      if (existant) {
        return prev.map((l) => l.serviceId === service.id ? { ...l, quantite: l.quantite + 1 } : l);
      }
      return [...prev, { serviceId: service.id, nom: service.nom, prix: Number(service.prix), quantite: 1 }];
    });
  }

  function retirerDuPanier(serviceId) {
    setPanier((prev) => prev.filter((l) => l.serviceId !== serviceId));
  }

  function changerQuantite(serviceId, delta) {
    setPanier((prev) =>
      prev
        .map((l) => l.serviceId === serviceId ? { ...l, quantite: l.quantite + delta } : l)
        .filter((l) => l.quantite > 0)
    );
  }

  const total = panier.reduce((s, l) => s + l.prix * l.quantite, 0);
  const chambreChoisie = chambresOccupees.find((c) => c.sejourId === Number(sejourChoisi));

  // ---------- Filtrage et rangement de la carte ----------
  const familles = [...new Set(services.map((s) => s.categorie))]
    .sort((a, b) => (LIBELLE_FAMILLE[a] || a).localeCompare(LIBELLE_FAMILLE[b] || b));

  const articlesVisibles = services.filter((s) => {
    if (familleActive !== 'TOUT' && s.categorie !== familleActive) return false;
    if (!recherche.trim()) return true;
    return sansAccents(s.nom).includes(sansAccents(recherche.trim()));
  });

  // Regroupés par famille, chaque famille triée par nom : deux fois le même article
  // ne peut plus se retrouver aux deux bouts de la grille.
  const groupesAffiches = familles
    .map((categorie) => ({
      categorie,
      articles: articlesVisibles
        .filter((s) => s.categorie === categorie)
        .sort((a, b) => a.nom.localeCompare(b.nom)),
    }))
    .filter((groupe) => groupe.articles.length > 0);

  async function handleValider() {
    setErreur(''); setSucces('');
    setEncaissementEnCours(true);
    const lignes = panier.map((l) => ({ serviceId: l.serviceId, quantite: l.quantite }));
    try {
      if (reglement === 'SUR_CHAMBRE') {
        const { chambreNumero, client } = await envoyerSurChambre(Number(sejourChoisi), lignes);
        setSucces(`${total.toFixed(2)} porté sur la note de la chambre ${chambreNumero} (${client}). Réglé au départ du client.`);
        setSejourChoisi('');
        setReglement('IMMEDIAT');
      } else {
        await creerVente(lignes);
        setSucces(`Vente encaissée : ${total.toFixed(2)}`);
      }
      setPanier([]);
      await chargerDonnees();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setEncaissementEnCours(false);
    }
  }

  if (chargement) return <p style={{ color: 'var(--slate)' }}>Chargement du menu...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-1)' }}>Point de vente Bar / Restaurant</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 'var(--space-5)' }}>
        Sélectionnez les articles, puis encaissez au comptoir ou portez la commande
        sur la note d'un client logé.
      </p>

      {erreur && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="erreur">{erreur}</Alerte></div>}
      <Toast message={succes} onFermer={() => setSucces('')} />

      {/* alignItems: start — sans lui, la colonne du panier s'étire sur toute la
          hauteur de la carte : un panier de trois lignes occupait un bloc blanc de
          deux écrans de haut. Chaque colonne prend maintenant sa hauteur propre. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-5)', alignItems: 'start' }}>
        {/* ---------- Catalogue ----------
            Une seule grille de 39 articles devient un mur indifférencié où l'on
            cherche à l'œil. On garde le geste — un article, un clic — mais on lui
            donne deux repères : une recherche pour aller droit au but quand on
            connaît le nom, et un rangement par famille pour parcourir. */}
        <div>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un article…"
            style={{ ...styleInput, marginBottom: 'var(--space-3)' }}
          />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            {['TOUT', ...familles].map((cle) => {
              const actif = familleActive === cle;
              const nombre = cle === 'TOUT' ? services.length : services.filter((s) => s.categorie === cle).length;
              return (
                <button
                  key={cle}
                  onClick={() => setFamilleActive(cle)}
                  style={{
                    padding: '7px 13px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 12.5,
                    fontWeight: actif ? 600 : 500,
                    border: `1px solid ${actif ? 'var(--moss)' : 'var(--line-strong)'}`,
                    background: actif ? 'var(--moss)' : 'var(--surface)',
                    color: actif ? '#fff' : 'var(--slate)',
                  }}
                >
                  {LIBELLE_FAMILLE[cle] || cle} <span className="mono" style={{ opacity: 0.7 }}>{nombre}</span>
                </button>
              );
            })}
          </div>

          {services.length === 0 ? (
            <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <p style={{ color: 'var(--slate)' }}>Aucun article au menu. Ajoutez-en depuis la page Services.</p>
            </Carte>
          ) : articlesVisibles.length === 0 ? (
            <Carte style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
              <p style={{ color: 'var(--slate)' }}>Aucun article ne correspond à « {recherche} ».</p>
            </Carte>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {groupesAffiches.map(({ categorie, articles }) => (
                <div key={categorie}>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--slate)', margin: '0 0 10px',
                  }}>
                    {LIBELLE_FAMILLE[categorie] || categorie}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
                    {articles.map((s) => {
                      const dejaAuPanier = panier.find((l) => l.serviceId === s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => ajouterAuPanier(s)}
                          title={s.description || s.nom}
                          style={{
                            position: 'relative', textAlign: 'left', cursor: 'pointer',
                            border: `1.5px solid ${dejaAuPanier ? 'var(--signal)' : 'var(--line)'}`,
                            borderRadius: 'var(--radius-md)',
                            background: dejaAuPanier ? 'var(--signal-dim-soft)' : 'var(--surface)',
                            padding: 'var(--space-3) var(--space-4)',
                            transition: 'border-color 0.12s, background 0.12s',
                          }}
                        >
                          <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--ink)', lineHeight: 1.3 }}>{s.nom}</p>
                          <p className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--signal-dark)', margin: '6px 0 0' }}>{s.prix}</p>

                          {/* Compteur : sur une carte longue, on perd vite le fil de
                              ce qu'on a déjà tapé. */}
                          {dejaAuPanier && (
                            <span style={{
                              position: 'absolute', top: -8, right: -8,
                              minWidth: 22, height: 22, padding: '0 6px', borderRadius: 11,
                              background: 'var(--moss)', color: '#fff',
                              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {dejaAuPanier.quantite}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Panier ----------
            Épinglé pendant qu'on parcourt la carte : le barman ajoute des articles
            en bas de liste et doit continuer à voir son total et son bouton.

            Il grandit librement avec le nombre d'articles. Le plafond de hauteur ne
            sert que dans le cas extrême où la commande dépasse la hauteur de l'écran :
            sans lui, le panier épinglé déborderait sous le bas de la fenêtre et le
            total comme le bouton de validation deviendraient inatteignables. */}
        <Carte style={{
          position: 'sticky',
          top: 'var(--space-4)',
          maxHeight: 'calc(100dvh - var(--space-6) * 2)',
          overflowY: 'auto',
        }}>
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Panier</h3>

          {panier.length === 0 ? (
            <p style={{ color: 'var(--slate)', fontSize: 13 }}>Aucun article sélectionné.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 'var(--space-4)' }}>
              {panier.map((l) => (
                <div key={l.serviceId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <div>
                    <p style={{ margin: 0 }}>{l.nom}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <button onClick={() => changerQuantite(l.serviceId, -1)} style={{ width: 22, height: 22, border: '1px solid var(--line)', borderRadius: 4, background: 'none', cursor: 'pointer' }}>−</button>
                      <span className="mono">{l.quantite}</span>
                      <button onClick={() => changerQuantite(l.serviceId, 1)} style={{ width: 22, height: 22, border: '1px solid var(--line)', borderRadius: 4, background: 'none', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="mono" style={{ margin: 0, fontWeight: 500 }}>{(l.prix * l.quantite).toFixed(2)}</p>
                    <button onClick={() => retirerDuPanier(l.serviceId)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 11 }}>Retirer</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, borderTop: '1px solid var(--line)', paddingTop: 12, marginBottom: 'var(--space-4)' }}>
            <span>Total</span>
            <span className="mono">{total.toFixed(2)}</span>
          </div>

          {/* ---------- Règlement : maintenant, ou sur la note de la chambre ----------
              Un client de passage paie au comptoir ; un client logé consomme et règle
              au départ. L'écran n'offrait que le premier cas. */}
          <p style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8, fontWeight: 500 }}>Règlement</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-4)' }}>
            {[
              { cle: 'IMMEDIAT', label: 'Payé maintenant' },
              { cle: 'SUR_CHAMBRE', label: 'Sur une chambre' },
            ].map(({ cle, label }) => {
              const actif = reglement === cle;
              const indisponible = cle === 'SUR_CHAMBRE' && chambresOccupees.length === 0;
              return (
                <button
                  key={cle}
                  type="button"
                  disabled={indisponible}
                  onClick={() => setReglement(cle)}
                  title={indisponible ? 'Aucun client logé actuellement' : undefined}
                  style={{
                    flex: 1,
                    background: actif ? 'var(--moss)' : 'var(--surface)',
                    color: indisponible ? 'var(--slate-light)' : actif ? '#fff' : 'var(--slate)',
                    border: `1px solid ${actif ? 'var(--moss)' : 'var(--line)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '8px 10px',
                    fontSize: 12.5, fontWeight: actif ? 600 : 500,
                    cursor: indisponible ? 'not-allowed' : 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {reglement === 'SUR_CHAMBRE' && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Champ label="Client logé">
                <select value={sejourChoisi} onChange={(e) => setSejourChoisi(e.target.value)} style={styleInput}>
                  <option value="">-- Choisir la chambre --</option>
                  {chambresOccupees.map((c) => (
                    <option key={c.sejourId} value={c.sejourId}>
                      Chambre {c.chambreNumero} · {c.client} · départ {formaterDepart(c)}
                      {c.departDepasse ? ' (dépassé)' : ''}
                      {c.remiseBarPourcent > 0 ? ` · remise ${c.remiseBarPourcent} %` : ''}
                    </option>
                  ))}
                </select>
              </Champ>

              {/* Le départ prévu, en clair : porter une tournée sur une chambre dont
                  le départ est passé, c'est risquer de facturer un client déjà parti. */}
              {chambreChoisie && (
                <p style={{
                  fontSize: 12.5, fontWeight: 500, margin: '8px 0 0',
                  padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                  color: chambreChoisie.departDepasse ? 'var(--danger)' : 'var(--slate)',
                  background: chambreChoisie.departDepasse ? 'var(--danger-bg)' : 'var(--stone)',
                }}>
                  {chambreChoisie.departDepasse
                    ? `Départ prévu le ${formaterDepart(chambreChoisie)} : il est dépassé. Vérifiez que le client est toujours dans l'établissement.`
                    : `Départ prévu le ${formaterDepart(chambreChoisie)}. Le client est encore dans l'établissement.`}
                </p>
              )}

              {/* La remise du client s'applique toute seule au moment de valider.
                  Le barman doit la voir avant, pour pouvoir l'annoncer. */}
              {chambreChoisie?.remiseBarPourcent > 0 && (
                <p style={{
                  fontSize: 12.5, fontWeight: 500, margin: '8px 0 0',
                  padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--success)', background: 'var(--success-bg)',
                }}>
                  Client fidèle : remise de {chambreChoisie.remiseBarPourcent} % appliquée
                  automatiquement. Total après remise :{' '}
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {(total * (1 - chambreChoisie.remiseBarPourcent / 100)).toFixed(2)}
                  </span>
                </p>
              )}

              <p style={{ fontSize: 12, color: 'var(--slate-light)', margin: '8px 0 0' }}>
                Rien n'est encaissé maintenant : le montant s'ajoute à la note du client
                et sera réglé à son départ.
              </p>
            </div>
          )}

          <Button
            onClick={handleValider}
            disabled={panier.length === 0 || (reglement === 'SUR_CHAMBRE' && !sejourChoisi)}
            enCours={encaissementEnCours}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {reglement === 'SUR_CHAMBRE' ? 'Mettre sur la note' : 'Encaisser'}
          </Button>
        </Carte>
      </div>

      {/* ---------- Commandes portées sur des notes ----------
          Elles n'entrent pas dans l'historique des ventes : rien n'a été encaissé
          au bar, le montant attend le départ du client. */}
      {surChambre.length > 0 && (
        <>
          <h3 style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Dernières commandes sur chambre</h3>
          <Carte padding="0">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    {['Date', 'Chambre', 'Client', 'Article', 'Montant', 'État'].map((h) => (
                      <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {surChambre.map((c, i) => (
                    <LigneTableau key={c.id} index={i}>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--slate)', whiteSpace: 'nowrap' }}>{new Date(c.dateConsommation).toLocaleString('fr-FR')}</td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13 }}>N°{c.chambreNumero}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13 }}>{c.client}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{c.service} ×{c.quantite}</td>
                      <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500 }}>{c.montant}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: c.reglee ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
                        {c.reglee ? 'Réglée au départ' : 'En attente du départ'}
                      </td>
                    </LigneTableau>
                  ))}
                </tbody>
              </table>
            </div>
          </Carte>
        </>
      )}

      {/* ---------- Historique récent ---------- */}
      <h3 style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Dernières ventes encaissées</h3>
      {historique.length === 0 ? (
        <p style={{ color: 'var(--slate)', fontSize: 13 }}>Aucune vente enregistrée.</p>
      ) : (
        <Carte padding="0">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                {['Date', 'Vendeur', 'Articles', 'Total'].map((h) => (
                  <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12, color: 'var(--slate)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historique.map((v, i) => (
                <LigneTableau key={v.id} index={i}>
                  <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--slate)' }}>{new Date(v.dateVente).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13 }}>{v.utilisateur.prenom} {v.utilisateur.nom}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{v.lignes.map((l) => `${l.service.nom} ×${l.quantite}`).join(', ')}</td>
                  <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500 }}>{v.montantTotal}</td>
                </LigneTableau>
              ))}
            </tbody>
          </table>
        </Carte>
      )}
    </div>
  );
}