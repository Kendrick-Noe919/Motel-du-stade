import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Interrupteur de licence.
//
// L'état « actif / suspendu » vit dans un simple fichier sur le serveur, DÉLIBÉRÉMENT
// hors de la base de données du client : il n'apparaît donc dans aucun écran de
// l'application (ni Paramètres, ni Historique), et une restauration de sauvegarde
// de la base ne le réactive pas par accident.
//
// Fichier absent = application active. C'est l'état normal : une installation neuve
// fonctionne sans qu'on ait à créer quoi que ce soit. La suspension est l'exception,
// écrite seulement quand on l'ordonne depuis la console privée.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// À la racine du backend, à côté de package.json. Ignoré par git (voir .gitignore),
// il ne part jamais dans le dépôt.
const CHEMIN_ETAT = path.resolve(__dirname, '../../.etat-licence.json');

// Lu à CHAQUE requête plutôt que mis en cache : sous PM2 en grappe, plusieurs
// processus servent l'API, et un cache mémoire les ferait diverger — l'un bloqué,
// l'autre ouvert. Le fichier est minuscule et servi depuis le cache disque de l'OS.
export function lireEtatSysteme() {
  try {
    const brut = fs.readFileSync(CHEMIN_ETAT, 'utf-8');
    const donnees = JSON.parse(brut);
    return {
      actif: donnees.actif !== false,
      message: donnees.message || null,
      modifieLe: donnees.modifieLe || null,
    };
  } catch {
    // Fichier absent ou illisible : on n'enferme jamais le client par accident.
    return { actif: true, message: null, modifieLe: null };
  }
}

export function definirEtatSysteme(actif, message) {
  const donnees = {
    actif: Boolean(actif),
    message: message || null,
    modifieLe: new Date().toISOString(),
  };
  fs.writeFileSync(CHEMIN_ETAT, JSON.stringify(donnees, null, 2), 'utf-8');
  return lireEtatSysteme();
}
