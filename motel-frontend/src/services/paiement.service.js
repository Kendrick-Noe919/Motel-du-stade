import api from './api';

export async function getPaiements() {
  const { data } = await api.get('/paiements');
  return data;
}

export async function enregistrerPaiement(paiement) {
  const { data } = await api.post('/paiements', paiement);
  return data;
}

// motif : obligatoire quand la prestation a déjà été rendue (client sur place ou
// séjour terminé). Le serveur refuse sans lui et explique pourquoi.
export async function rembourserPaiement(id, annulerReservation, motif) {
  const { data } = await api.patch(`/paiements/${id}/rembourser`, { annulerReservation, motif });
  return data;
}
export async function telechargerFacture(paiementId, numeroFacture) {
  const reponse = await api.get(`/paiements/${paiementId}/facture`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([reponse.data]));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `${numeroFacture || 'facture'}.pdf`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}