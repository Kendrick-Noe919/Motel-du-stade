import { useState, useEffect } from 'react';

export function useDebounce(valeur, delai = 400) {
  const [valeurDebounced, setValeurDebounced] = useState(valeur);

  useEffect(() => {
    const timer = setTimeout(() => setValeurDebounced(valeur), delai);
    return () => clearTimeout(timer); // annule le timer précédent si "valeur" change avant la fin du délai
  }, [valeur, delai]);

  return valeurDebounced;
}