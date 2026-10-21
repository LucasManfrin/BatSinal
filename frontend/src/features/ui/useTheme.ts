import { useEffect, useState } from 'react';

export function useTheme() {
  const [light, setLight] = useState(() => localStorage.getItem('batsinal.theme') !== 'dark');
  useEffect(() => {
    const refresh = () => setLight(localStorage.getItem('batsinal.theme') !== 'dark');
    window.addEventListener('batsinal:theme', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('batsinal:theme', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
  }, [light]);
  function changeTheme(value: boolean) {
    localStorage.setItem('batsinal.theme', value ? 'light' : 'dark');
    setLight(value);
    window.dispatchEvent(new Event('batsinal:theme'));
  }
  return { light, changeTheme };
}
