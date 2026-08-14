import { useState, useEffect } from 'react';
import { rechercherClients } from '../services/client.service';
import Champ, { styleInput, focusHandlers } from './ui/Champ';
import { useDebounce } from '../hooks/useDebounce';

// Saisie du client directement dans le formulaire de réservation.
//
// Au téléphone, le client n'a pas le temps qu'on ouvre la page Clients pour créer
// sa fiche avant de revenir réserver. Le pivot est le numéro, déjà unique en base :
// on tape, on voit si la personne est connue, sinon on complète sur place et le
// serveur crée la fiche en même temps que la réservation.
//
// ⚠️ La hauteur du composant ne doit JAMAIS changer pendant la frappe : la ligne de
// statut et les champs d'identité sont toujours montés, seul leur contenu varie.
// Sinon la fenêtre saute à chaque chiffre saisi.
const LONGUEUR_MINI = 4;

export default function ChampClient({ valeur, onChanger }) {
  const [telephone, setTelephone] = useState(valeur?.telephone || '');
  const [nom, setNom] = useState(valeur?.nom || '');
  const [prenom, setPrenom] = useState(valeur?.prenom || '');
  const [trouve, setTrouve] = useState(null);
  const [recherche, setRecherche] = useState(false);

  const telephoneDebounce = useDebounce(telephone, 350);
  const assezLong = telephoneDebounce.trim().length >= LONGUEUR_MINI;

  useEffect(() => {
    let actif = true;
    const numero = telephoneDebounce.trim();

    if (numero.length < LONGUEUR_MINI) {
      setTrouve(null);
      setRecherche(false);
      onChanger({ telephone: numero, nom, prenom, clientId: null });
      return undefined;
    }

    setRecherche(true);
    rechercherClients(numero)
      .then((resultats) => {
        if (!actif) return;
        // Correspondance exacte sur le numéro : c'est bien la même personne
        const exact = resultats.find((c) => c.telephone === numero);
        setTrouve(exact || null);
        if (exact) {
          setNom(exact.nom || '');
          setPrenom(exact.prenom || '');
          onChanger({ clientId: exact.id, telephone: exact.telephone, nom: exact.nom, prenom: exact.prenom });
        } else {
          onChanger({ telephone: numero, nom, prenom, clientId: null });
        }
      })
      .catch(() => { if (actif) setTrouve(null); })
      .finally(() => { if (actif) setRecherche(false); });

    return () => { actif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telephoneDebounce]);

  function majIdentite(champ, val) {
    const suivant = champ === 'nom' ? { nom: val, prenom } : { nom, prenom: val };
    if (champ === 'nom') setNom(val); else setPrenom(val);
    onChanger({ telephone: telephone.trim(), ...suivant, clientId: trouve?.id ?? null });
  }

  // Une seule ligne de statut, toujours présente, dont seul le contenu change
  const statut = !assezLong
    ? { texte: `Saisissez au moins ${LONGUEUR_MINI} chiffres pour rechercher le client.`, fond: 'var(--stone)', couleur: 'var(--slate)', bordure: 'var(--line)' }
    : recherche
      ? { texte: 'Recherche du client...', fond: 'var(--stone)', couleur: 'var(--slate-light)', bordure: 'var(--line)' }
      : trouve
        ? {
            texte: `Client connu : ${[trouve.prenom, trouve.nom].filter(Boolean).join(' ') || trouve.telephone}. Sa fiche est rattachée.`,
            fond: 'var(--signal-dim-soft)', couleur: 'var(--moss)', bordure: 'var(--signal)',
          }
        : { texte: 'Nouveau numéro. La fiche client sera créée avec la réservation.', fond: 'var(--stone)', couleur: 'var(--slate)', bordure: 'var(--line)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Champ label="Téléphone du client">
        <input
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          required
          inputMode="tel"
          placeholder="ex: 771234567"
          style={styleInput}
          {...focusHandlers}
        />
      </Champ>

      {/* Hauteur fixe : la fenêtre ne bouge pas pendant la frappe */}
      <p
        aria-live="polite"
        style={{
          margin: 0, fontSize: 12.5, lineHeight: 1.4,
          minHeight: 38, display: 'flex', alignItems: 'center',
          padding: '0 var(--space-3)', borderRadius: 'var(--radius-sm)',
          background: statut.fond, color: statut.couleur,
          border: `1px solid ${statut.bordure}`,
          transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        }}
      >
        {statut.texte}
      </p>

      {/* Toujours montés : quand le client est connu, ils affichent sa fiche en lecture seule */}
      <div className="grille-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <Champ label={trouve ? 'Prénom' : 'Prénom (optionnel)'}>
          <input
            value={prenom}
            onChange={(e) => majIdentite('prenom', e.target.value)}
            readOnly={Boolean(trouve)}
            style={{ ...styleInput, background: trouve ? 'var(--stone)' : undefined, cursor: trouve ? 'not-allowed' : undefined }}
            {...focusHandlers}
          />
        </Champ>
        <Champ label={trouve ? 'Nom' : 'Nom (optionnel)'}>
          <input
            value={nom}
            onChange={(e) => majIdentite('nom', e.target.value)}
            readOnly={Boolean(trouve)}
            style={{ ...styleInput, background: trouve ? 'var(--stone)' : undefined, cursor: trouve ? 'not-allowed' : undefined }}
            {...focusHandlers}
          />
        </Champ>
      </div>
    </div>
  );
}
