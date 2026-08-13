import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';

const champsPublics = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  actif: true,
  createdAt: true,
  roles: { select: { role: { select: { id: true, libelle: true } } } },
};

// Aplati la structure roles: [{ role: {...} }] en roles: [{...}] pour un JSON plus simple côté frontend
function formaterUtilisateur(utilisateur) {
  return { ...utilisateur, roles: utilisateur.roles.map((r) => r.role) };
}

// ---------- POST /api/utilisateurs ----------
// Créer un utilisateur avec un ou plusieurs rôles (réservé à l'Administrateur)
export async function createUtilisateur(req, res) {
  try {
    const { nom, prenom, email, motDePasse, telephone, roleIds } = req.body;

    if (!nom || !prenom || !email || !motDePasse || !roleIds?.length) {
      return res.status(400).json({
        message: 'nom, prenom, email, motDePasse et roleIds (au moins un) sont requis',
      });
    }

    const motDePasseHash = await bcrypt.hash(motDePasse, 10);

    const utilisateur = await prisma.utilisateur.create({
      data: {
        nom, prenom, email, telephone,
        motDePasse: motDePasseHash,
        roles: {
          create: roleIds.map((roleId) => ({ role: { connect: { id: Number(roleId) } } })),
        },
      },
      select: champsPublics,
    });

    res.status(201).json(formaterUtilisateur(utilisateur));
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- GET /api/utilisateurs ----------
export async function getAllUtilisateurs(req, res) {
  try {
    const utilisateurs = await prisma.utilisateur.findMany({ select: champsPublics });
    res.json(utilisateurs.map(formaterUtilisateur));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- PATCH /api/utilisateurs/:id ----------
// Modifier un utilisateur (infos de base, activation/désactivation)
export async function modifierUtilisateur(req, res) {
  try {
    const { id } = req.params;
    const { nom, prenom, telephone, actif } = req.body;

    const utilisateur = await prisma.utilisateur.update({
      where: { id: Number(id) },
      data: { nom, prenom, telephone, actif },
      select: champsPublics,
    });

    res.json(formaterUtilisateur(utilisateur));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- POST /api/utilisateurs/:id/roles ----------
// Attribuer un rôle supplémentaire à un utilisateur existant
export async function attribuerRole(req, res) {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ message: 'roleId est requis' });
    }

    await prisma.utilisateurRole.create({
      data: {
        utilisateur: { connect: { id: Number(id) } },
        role: { connect: { id: Number(roleId) } },
      },
    });

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: Number(id) },
      select: champsPublics,
    });

    res.json(formaterUtilisateur(utilisateur));
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Cet utilisateur a déjà ce rôle' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

// ---------- DELETE /api/utilisateurs/:id/roles/:roleId ----------
// Retirer un rôle
export async function retirerRole(req, res) {
  try {
    const { id, roleId } = req.params;

    await prisma.utilisateurRole.delete({
      where: {
        utilisateurId_roleId: { utilisateurId: Number(id), roleId: Number(roleId) },
      },
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Cette association utilisateur/rôle n\'existe pas' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
// DELETE /api/utilisateurs/:id
export async function deleteUtilisateur(req, res) {
  try {
    const { id } = req.params;

    // On nettoie d'abord les associations de rôles (relation N-N)
    await prisma.utilisateurRole.deleteMany({ where: { utilisateurId: Number(id) } });
    await prisma.utilisateur.delete({ where: { id: Number(id) } });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'Impossible de supprimer : cet utilisateur a des caisses ou mouvements associés. Désactivez-le plutôt.' });
    }
    if (error.code === 'P2025') return res.status(404).json({ message: 'Utilisateur non trouvé' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}