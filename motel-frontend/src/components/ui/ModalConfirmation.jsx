import Modal from './Modal';
import Button from './Button';

export default function ModalConfirmation({ ouvert, onFermer, onConfirmer, titre, message, texteConfirmer = 'Confirmer', variante = 'danger', enCours = false }) {
  return (
    <Modal ouvert={ouvert} onFermer={onFermer} titre={titre} largeur={400}>
      <p style={{ color: 'var(--slate)', marginBottom: 'var(--space-5)' }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
        <Button variante="secondaire" onClick={onFermer}>Annuler</Button>
        <Button variante={variante} onClick={onConfirmer} enCours={enCours}>{texteConfirmer}</Button>
      </div>
    </Modal>
  );
}