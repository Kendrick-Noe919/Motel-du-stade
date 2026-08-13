import { useState } from 'react';

export default function LigneTableau({ children, style }) {
  const [survol, setSurvol] = useState(false);

  return (
    <tr
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      style={{
        borderBottom: '1px solid var(--line)',
        background: survol ? 'var(--stone-dim)' : 'transparent',
        transition: 'background 0.1s',
        ...style,
      }}
    >
      {children}
    </tr>
  );
}