import prisma from './prisma.js';

// Écrit une ligne dans le journal des opérations.
//
// `client` accepte aussi bien `prisma` que le `tx` d'une transaction : quand une
// opération est transactionnelle, sa trace doit l'être aussi, sinon on garderait
// la trace d'un paiement qui a échoué.
//
// Le nom de l'auteur est figé au moment de l'écriture : il survit à l'archivage du
// compte, et le journal reste lisible même si l'employé est parti.
export async function tracer(client, req, { action, cibleType, cibleId, resume, avant, apres }) {
  try {
    await client.journalOperation.create({
      data: {
        action,
        cibleType,
        cibleId: cibleId ?? null,
        resume,
        avant: avant ?? null,
        apres: apres ?? null,
        utilisateurId: req?.user?.id ?? null,
        auteurNom: req?.user?.nomComplet ?? null,
      },
    });
  } catch (erreur) {
    // Le journal ne doit jamais faire échouer l'opération métier qu'il observe.
    console.error('Journal : écriture impossible', erreur.message);
  }
}

// Lecture filtrée, pour l'écran Historique
export async function lireJournal({ debut, fin, utilisateurId, action, cibleType, limite = 200 }) {
  return prisma.journalOperation.findMany({
    where: {
      ...(debut || fin ? { dateOperation: { ...(debut && { gte: debut }), ...(fin && { lte: fin }) } } : {}),
      ...(utilisateurId && { utilisateurId: Number(utilisateurId) }),
      ...(action && { action }),
      ...(cibleType && { cibleType }),
    },
    orderBy: { dateOperation: 'desc' },
    take: Number(limite),
  });
}
