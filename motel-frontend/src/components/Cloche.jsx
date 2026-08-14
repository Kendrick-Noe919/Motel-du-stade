import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, marquerLue, marquerToutesLues } from '../services/notification.service';

// Même cadence que le rafraîchissement des chambres : à cette échelle, un sondage
// régulier suffit largement, un websocket serait de la complexité pour rien.
const INTERVALLE_MS = 20000;

function ilYA(date) {
  const minutes = Math.round((Date.now() - new Date(date)) / 60000);
  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  return new Date(date).toLocaleDateString('fr-FR');
}

export default function Cloche() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [nonLues, setNonLues] = useState(0);
  const [ouvert, setOuvert] = useState(false);

  const charger = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setNonLues(data.nonLues);
    } catch {
      // Silencieux : une cloche qui n'a pas pu se rafraîchir ne doit pas polluer l'écran
    }
  }, []);

  useEffect(() => {
    charger();
    const minuteur = setInterval(charger, INTERVALLE_MS);
    return () => clearInterval(minuteur);
  }, [charger]);

  async function ouvrirNotification(notification) {
    setOuvert(false);
    if (!notification.lue) {
      await marquerLue(notification.id).catch(() => {});
      await charger();
    }
    if (notification.lien) navigate(notification.lien);
  }

  async function toutMarquer() {
    await marquerToutesLues().catch(() => {});
    await charger();
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOuvert(!ouvert)}
        aria-label={`Notifications${nonLues > 0 ? ` : ${nonLues} non lue(s)` : ''}`}
        style={{
          position: 'relative', background: 'none', border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)', width: 34, height: 34, fontSize: 15,
          cursor: 'pointer', color: 'var(--slate)',
        }}
      >
        ◔
        {nonLues > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6, minWidth: 17, height: 17,
            padding: '0 4px', borderRadius: 999, background: 'var(--danger)', color: '#fff',
            fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <>
          <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, zIndex: 15 }} />
          <div style={{
            position: 'absolute', right: 0, top: '125%', width: 330, maxHeight: 420, overflowY: 'auto',
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)', zIndex: 20,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0,
              background: 'var(--surface)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
              {nonLues > 0 && (
                <button onClick={toutMarquer} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5,
                  color: 'var(--moss)', fontWeight: 500, padding: 0,
                }}>
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--slate)', fontSize: 13, margin: 0 }}>
                Aucune notification.
              </p>
            ) : notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => ouvrirNotification(n)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '11px 14px', border: 'none', borderBottom: '1px solid var(--line)',
                  background: n.lue ? 'transparent' : 'var(--signal-dim-soft)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  {!n.lue && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--signal)', flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, fontWeight: n.lue ? 500 : 600, color: 'var(--ink)' }}>{n.titre}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--slate)', lineHeight: 1.45 }}>{n.message}</p>
                <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--slate-light)', fontFamily: 'var(--font-mono)' }}>
                  {ilYA(n.dateCreation)}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
