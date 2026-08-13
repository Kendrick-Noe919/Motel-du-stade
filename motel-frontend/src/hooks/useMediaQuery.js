import { useState, useEffect } from 'react';

export function useMediaQuery(requete) {
  const [correspond, setCorrespond] = useState(() => window.matchMedia(requete).matches);

  useEffect(() => {
    const media = window.matchMedia(requete);
    function handleChange() {
      setCorrespond(media.matches);
    }
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [requete]);

  return correspond;
}

// Raccourcis prêts à l'emploi, cohérents avec les breakpoints standards
export function useIsMobile() {
  return useMediaQuery('(max-width: 640px)');
}
export function useIsTablet() {
  return useMediaQuery('(max-width: 1024px)');
}