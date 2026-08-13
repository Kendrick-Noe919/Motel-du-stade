import { useState, useEffect } from 'react';
import { getServices } from '../services/service.service';
import { creerVente, getVentes } from '../services/vente.service';
import Button from '../components/ui/Button';
import Carte from '../components/ui/Carte';
import Alerte from '../components/ui/Alerte';

const CATEGORIES_BAR = ['RESTAURANT', 'MINIBAR'];

export default function Ventes() {
  const [services, setServices] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [panier, setPanier] = useState([]); // [{ serviceId, nom, prix, quantite }]
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [encaissementEnCours, setEncaissementEnCours] = useState(false);

  useEffect(() => { chargerDonnees(); }, []);

  async function chargerDonnees() {
    try {
      setChargement(true);
      const [servicesData, ventesData] = await Promise.all([getServices(), getVentes()]);
      setServices(servicesData.filter((s) => CATEGORIES_BAR.includes(s.categorie)));
      setHistorique(ventesData.slice(0, 10));
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

  async function handleEncaisser() {
    setErreur(''); setSucces('');
    setEncaissementEnCours(true);
    try {
      await creerVente(panier.map((l) => ({ serviceId: l.serviceId, quantite: l.quantite })));
      setSucces(`Vente encaissée : ${total.toFixed(2)}`);
      setPanier([]);
      await chargerDonnees();
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur lors de l\'encaissement');
    } finally {
      setEncaissementEnCours(false);
    }
  }

  if (chargement) return <p style={{ color: 'var(--slate)' }}>Chargement du menu...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-1)' }}>Point de vente — Bar / Restaurant</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 'var(--space-5)' }}>Sélectionnez les articles vendus, puis encaissez.</p>

      {erreur && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="erreur">{erreur}</Alerte></div>}
      {succes && <div style={{ marginBottom: 'var(--space-4)' }}><Alerte variante="succes">{succes}</Alerte></div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-5)' }}>
        {/* ---------- Catalogue ---------- */}
        <div>
          {services.length === 0 ? (
            <Carte style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <p style={{ color: 'var(--slate)' }}>Aucun article au menu. Ajoute-en depuis la page Services.</p>
            </Carte>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => ajouterAuPanier(s)}
                  style={{
                    textAlign: 'left', cursor: 'pointer', border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-md)', background: 'var(--surface)', padding: 'var(--space-4)',
                  }}
                >
                  <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}>{s.nom}</p>
                  <p className="mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--signal-dark)', margin: '6px 0 0' }}>{s.prix}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------- Panier ---------- */}
        <Carte>
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

          <Button onClick={handleEncaisser} disabled={panier.length === 0} enCours={encaissementEnCours} style={{ width: '100%', justifyContent: 'center' }}>
            Encaisser
          </Button>
        </Carte>
      </div>

      {/* ---------- Historique récent ---------- */}
      <h3 style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>Dernières ventes</h3>
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
              {historique.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--slate)' }}>{new Date(v.dateVente).toLocaleString('fr-FR')}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13 }}>{v.utilisateur.prenom} {v.utilisateur.nom}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, color: 'var(--slate)' }}>{v.lignes.map((l) => `${l.service.nom} ×${l.quantite}`).join(', ')}</td>
                  <td className="mono" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 13, fontWeight: 500 }}>{v.montantTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Carte>
      )}
    </div>
  );
}