// Carte du bar et du restaurant — jeu de démonstration.
//
//   npm run seed:carte
//
// Rejouable : chaque article est retrouvé par son nom, seuls les manquants sont
// créés. Les prix d'un article existant ne sont jamais écrasés — la carte réelle
// se règle depuis l'écran Services, et ce script ne doit pas défaire ce travail.
//
// Prix en francs CFA, cohérents avec une auberge au Gabon.

import prisma from '../src/utils/prisma.js';

const CARTE = [
  // ---------- Restauration ----------
  { nom: 'Poulet braisé', categorie: 'RESTAURANT', prix: 6000, description: 'Accompagné de bananes plantain' },
  { nom: 'Poisson braisé', categorie: 'RESTAURANT', prix: 7000, description: 'Capitaine, sauce tomate' },
  { nom: 'Brochette poulet', categorie: 'RESTAURANT', prix: 2500 },
  { nom: 'Brochette bœuf', categorie: 'RESTAURANT', prix: 3000 },
  { nom: 'Riz sauce arachide', categorie: 'RESTAURANT', prix: 4500 },
  { nom: 'Poulet DG', categorie: 'RESTAURANT', prix: 8000, description: 'Plantain, légumes' },
  { nom: 'Feuilles de manioc', categorie: 'RESTAURANT', prix: 4000 },
  { nom: 'Atsèkè poisson', categorie: 'RESTAURANT', prix: 5000 },
  { nom: 'Spaghetti bolognaise', categorie: 'RESTAURANT', prix: 4500 },
  { nom: 'Salade composée', categorie: 'RESTAURANT', prix: 3500 },
  { nom: 'Omelette', categorie: 'RESTAURANT', prix: 2000 },
  { nom: 'Petit déj standard', categorie: 'RESTAURANT', prix: 3000, description: 'Café, pain, œufs' },
  { nom: 'Petit déj complet', categorie: 'RESTAURANT', prix: 5000, description: 'Café, pain, œufs, jus, fruits' },
  { nom: 'Frites', categorie: 'RESTAURANT', prix: 2000 },
  { nom: 'Alloco', categorie: 'RESTAURANT', prix: 1500 },

  // ---------- Desserts ----------
  { nom: 'Salade de fruits', categorie: 'RESTAURANT', prix: 2000 },
  { nom: 'Beignets sucrés', categorie: 'RESTAURANT', prix: 1000 },
  { nom: 'Glace vanille', categorie: 'RESTAURANT', prix: 1500 },
  { nom: 'Gâteau au chocolat', categorie: 'RESTAURANT', prix: 2500 },
  { nom: 'Ananas frais', categorie: 'RESTAURANT', prix: 1500 },
  { nom: 'Yaourt nature', categorie: 'RESTAURANT', prix: 1000 },

  // ---------- Bar et minibar ----------
  { nom: 'Jus d\'orange', categorie: 'MINIBAR', prix: 2500 },
  { nom: 'Jus d\'ananas', categorie: 'MINIBAR', prix: 2500 },
  { nom: 'Eau minérale 1,5 L', categorie: 'MINIBAR', prix: 1000 },
  { nom: 'Eau minérale 50 cl', categorie: 'MINIBAR', prix: 500 },
  { nom: 'Coca-Cola', categorie: 'MINIBAR', prix: 1500 },
  { nom: 'Fanta', categorie: 'MINIBAR', prix: 1500 },
  { nom: 'Sprite', categorie: 'MINIBAR', prix: 1500 },
  { nom: 'Régab (bière)', categorie: 'MINIBAR', prix: 2000 },
  { nom: 'Castel (bière)', categorie: 'MINIBAR', prix: 2000 },
  { nom: 'Guinness', categorie: 'MINIBAR', prix: 2500 },
  { nom: 'Vin rouge (verre)', categorie: 'MINIBAR', prix: 3000 },
  { nom: 'Whisky (dose)', categorie: 'MINIBAR', prix: 4000 },
  { nom: 'Café expresso', categorie: 'MINIBAR', prix: 1000 },
  { nom: 'Thé', categorie: 'MINIBAR', prix: 800 },
  { nom: 'Cocktail maison', categorie: 'MINIBAR', prix: 5000 },

  // ---------- Blanchisserie ----------
  { nom: 'Lavage chemise', categorie: 'BLANCHISSERIE', prix: 1500 },
  { nom: 'Lavage pantalon', categorie: 'BLANCHISSERIE', prix: 2000 },
  { nom: 'Repassage (pièce)', categorie: 'BLANCHISSERIE', prix: 1000 },
];

async function main() {
  let crees = 0;
  let existants = 0;

  for (const article of CARTE) {
    const deja = await prisma.service.findFirst({ where: { nom: article.nom } });
    if (deja) {
      existants += 1;
      continue;
    }
    await prisma.service.create({
      data: {
        nom: article.nom,
        categorie: article.categorie,
        prix: article.prix,
        description: article.description || null,
      },
    });
    crees += 1;
  }

  const total = await prisma.service.count();
  console.log(`${crees} article(s) créé(s), ${existants} déjà présent(s).`);
  console.log(`La carte compte maintenant ${total} article(s).`);
}

main()
  .catch((erreur) => {
    console.error('Échec du remplissage de la carte :', erreur.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
