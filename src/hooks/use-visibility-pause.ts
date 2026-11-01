import { useEffect } from 'react';
export function useVisibilityPause(onPause: () => void) {
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) onPause();
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', onPause);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', onPause);
    };
  }, [onPause]);
}
