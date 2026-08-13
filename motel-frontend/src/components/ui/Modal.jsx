import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ ouvert, onFermer, titre, children, largeur = 480 }) {
  // Ferme la modale avec la touche Échap — un réflexe UX attendu
  useEffect(() => {
    if (!ouvert) return;
    function handleEchap(e) {
      if (e.key === 'Escape') onFermer();
    }
    document.addEventListener('keydown', handleEchap);
    return () => document.removeEventListener('keydown', handleEchap);
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  return createPortal(
    <div
      onClick={onFermer}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(28, 35, 32, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          width: largeur,
          maxWidth: '92vw',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2>{titre}</h2>
          <button
            onClick={onFermer}
            aria-label="Fermer"
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--slate)', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}