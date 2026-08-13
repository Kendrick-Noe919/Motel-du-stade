import prisma from '../utils/prisma.js';

export async function getAllRoles(req, res) {
  try {
    const roles = await prisma.role.findMany();
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}

export async function createRole(req, res) {
  try {
    const { libelle, description } = req.body;
    if (!libelle) {
      return res.status(400).json({ message: 'libelle est requis' });
    }

    const role = await prisma.role.create({ data: { libelle, description } });
    res.status(201).json(role);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ce rôle existe déjà' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}
// DELETE /api/roles/:id
export async function deleteRole(req, res) {
  try {
    const { id } = req.params;
    await prisma.role.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'Impossible de supprimer : ce rôle est encore attribué à des utilisateurs' });
    }
    if (error.code === 'P2025') return res.status(404).json({ message: 'Rôle non trouvé' });
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}