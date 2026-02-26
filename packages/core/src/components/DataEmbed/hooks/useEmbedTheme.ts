import { useState, useEffect } from 'react';

export function useEmbedTheme() {
  const [theme, setTheme] = useState({
    primary: 'hsl(0 0% 0%)', // Default
    ring: 'hsl(0 0% 0%)',
    bg: 'hsl(0 0% 100%)',
    text: 'hsl(0 0% 0%)',
    headmateWhite: 'hsl(0 0% 100%)',
    raw: {
      primary: '0 0% 0%'
    }
  });

  useEffect(() => {
    const updateTheme = () => {
      if (typeof window === 'undefined') return;

      const styles = getComputedStyle(document.documentElement);
      const getVal = (varName: string) => styles.getPropertyValue(varName).trim();

      const p = getVal('--primary');
      const r = getVal('--ring');
      const hw = getVal('--headmate-white');

      setTheme({
        primary: p ? `hsl(${p})` : '#000',
        ring: r ? `hsl(${r})` : '#000',
        bg: 'hsl(var(--background))',
        text: 'hsl(var(--foreground))',
        headmateWhite: hw ? `hsl(${hw})` : '#fff',
        raw: {
          primary: p
        }
      });
    };

    // Initial load
    updateTheme();

    // Observer for changes (e.g. useThemeReactor updates)
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}
