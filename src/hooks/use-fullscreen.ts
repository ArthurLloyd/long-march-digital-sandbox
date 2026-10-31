import { useEffect, useState } from 'react';

export function useFullscreen() {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const update = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  async function toggle() {
    try {
      setError('');
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else setError('此浏览器暂不支持全屏，请使用浏览器的全屏功能。');
    } catch {
      setError('无法进入全屏，请使用浏览器的全屏功能。');
    }
  }
  return { active, error, toggle };
}
