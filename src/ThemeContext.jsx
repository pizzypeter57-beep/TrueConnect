import { createContext, useContext, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem('trueconnect-theme');
    if (savedTheme === 'day' || savedTheme === 'night') return savedTheme;
  } catch {
    return 'day';
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light';
    try {
      window.localStorage.setItem('trueconnect-theme', theme);
    } catch {
      return;
    }
  }, [theme]);

  const value = {
    theme,
    toggleTheme: () => setTheme((current) => current === 'day' ? 'night' : 'day'),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider.');
  return context;
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'day' ? 'night' : 'day';
  const Icon = theme === 'day' ? Moon : Sun;
  return (
    <button
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={theme === 'night'}
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Switch to ${nextTheme} theme`}
      type="button"
    >
      <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
    </button>
  );
}