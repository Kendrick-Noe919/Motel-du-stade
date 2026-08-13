import prisma from './src/utils/prisma.js';

const roles = await prisma.role.findMany();
console.log('Connexion réussie ✅ Rôles trouvés :', roles);

process.exit(0);