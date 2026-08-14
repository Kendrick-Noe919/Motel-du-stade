// Provisionnement des comptes du personnel.
//
//   npm run seed                      crée ce qui manque, ne touche à rien d'existant
//   npm run seed -- --forcer-mots-de-passe    réinitialise aussi les mots de passe
//
// Le script est rejouable : il retrouve les rôles et les comptes par leur clé
// unique (code du rôle, e-mail de l'utilisateur) et ne crée que ce qui manque.
// Lancé deux fois, il ne produit pas de doublon.
//
// Les mots de passe ne sont JAMAIS écrasés par défaut : une fois en production,
// le personnel change les siens, et rejouer le script pour ajouter un compte ne
// doit pas réinitialiser ceux des autres.

import bcrypt from 'bcrypt';
import prisma from '../src/utils/prisma.js';

// Même coût que la création de compte par l'écran Utilisateurs : un hachage plus
// faible ici créerait des comptes moins protégés que les autres.
const COUT_HACHAGE = 10;

const forcerMotsDePasse = process.argv.includes('--forcer-mots-de-passe');

// Les libellés ne sont posés qu'à la création : sur une base déjà en service, ils
// ont pu être renommés depuis l'écran Paramètres, et le code fait foi.
const ROLES = [
  { code: 'ADMIN', libelle: 'Administrateur', description: 'Accès complet à l\'établissement' },
  { code: 'STANDARDISTE', libelle: 'Réceptionniste', description: 'Réservations, séjours, clients, chambres' },
  { code: 'CAISSIER', libelle: 'Caissier', description: 'Encaissements et contrôle des caisses' },
  { code: 'BARMAN', libelle: 'Barman', description: 'Point de vente bar et restaurant' },
];

// Le domaine et les mots de passe se surchargent par variables d'environnement :
// les identifiants réels de production n'ont pas à vivre dans le dépôt.
const DOMAINE = process.env.SEED_DOMAINE || 'instant-motel.com';

const COMPTES = [
  {
    role: 'ADMIN',
    prenom: 'Chris',
    nom: 'Obame',
    email: `admin@${DOMAINE}`,
    motDePasse: process.env.SEED_MDP_ADMIN || 'Admin@@2026',
  },
  {
    role: 'STANDARDISTE',
    prenom: 'Noé',
    nom: 'Mintsa',
    email: `standardiste@${DOMAINE}`,
    motDePasse: process.env.SEED_MDP_STANDARDISTE || 'Standardiste@@2026',
  },
  {
    role: 'BARMAN',
    prenom: 'Yann',
    nom: 'Moussavou',
    email: `barman@${DOMAINE}`,
    motDePasse: process.env.SEED_MDP_BARMAN || 'Barman@@2026',
  },
  {
    role: 'CAISSIER',
    prenom: 'Léa',
    nom: 'Boussougou',
    email: `caissier@${DOMAINE}`,
    motDePasse: process.env.SEED_MDP_CAISSIER || 'Caissier@@2026',
  },
];

async function provisionnerRoles() {
  const parCode = new Map();
  for (const { code, libelle, description } of ROLES) {
    const role = await prisma.role.upsert({
      where: { code },
      update: {},
      create: { code, libelle, description },
    });
    parCode.set(code, role);
  }
  return parCode;
}

async function provisionnerCompte(compte, roles) {
  const role = roles.get(compte.role);
  const existant = await prisma.utilisateur.findUnique({
    where: { email: compte.email },
    include: { roles: true },
  });

  if (!existant) {
    const utilisateur = await prisma.utilisateur.create({
      data: {
        prenom: compte.prenom,
        nom: compte.nom,
        email: compte.email,
        motDePasse: await bcrypt.hash(compte.motDePasse, COUT_HACHAGE),
        actif: true,
        roles: { create: { roleId: role.id } },
      },
    });
    return { etat: 'cree', utilisateur };
  }

  // Le rôle est réaffirmé même sur un compte existant : un compte sans rôle ne
  // peut plus rien faire dans l'application, et c'est invisible depuis l'écran.
  const aDejaLeRole = existant.roles.some((r) => r.roleId === role.id);
  if (!aDejaLeRole) {
    await prisma.utilisateurRole.create({ data: { utilisateurId: existant.id, roleId: role.id } });
  }

  if (forcerMotsDePasse) {
    await prisma.utilisateur.update({
      where: { id: existant.id },
      data: { motDePasse: await bcrypt.hash(compte.motDePasse, COUT_HACHAGE), actif: true },
    });
    return { etat: 'mot de passe réinitialisé', utilisateur: existant };
  }

  return { etat: aDejaLeRole ? 'déjà présent' : 'rôle ajouté', utilisateur: existant };
}

async function main() {
  console.log(`Provisionnement sur le domaine « ${DOMAINE} »`);
  if (forcerMotsDePasse) {
    console.log('⚠  --forcer-mots-de-passe : les mots de passe des comptes ci-dessous seront réinitialisés.\n');
  }

  const roles = await provisionnerRoles();
  console.log(`Rôles disponibles : ${[...roles.keys()].join(', ')}\n`);

  for (const compte of COMPTES) {
    const { etat } = await provisionnerCompte(compte, roles);
    console.log(`  ${compte.email.padEnd(36)} ${compte.role.padEnd(14)} ${etat}`);
  }

  console.log('\nTerminé. Faites changer ces mots de passe à la première connexion.');
}

main()
  .catch((erreur) => {
    console.error('Échec du provisionnement :', erreur.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
