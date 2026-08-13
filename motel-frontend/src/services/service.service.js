import api from './api';

export async function getServices() {
  const { data } = await api.get('/services');
  return data;
}

export async function creerService(service) {
  const { data } = await api.post('/services', service);
  return data;
}

export async function modifierService(id, changements) {
  const { data } = await api.patch(`/services/${id}`, changements);
  return data;
}

export async function supprimerService(id) {
  await api.delete(`/services/${id}`);
}
export async function createService(req, res) {
  try {
    const { nom, categorie, prix, description } = req.body;
    // ...
    const service = await prisma.service.create({
      data: { nom, categorie: categorie || 'AUTRE', prix: Number(prix), description }
    });
    res.status(201).json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}