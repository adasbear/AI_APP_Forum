import React, { createContext, useContext, useEffect, useState } from 'react';

// Create a context for theme management
const ThemeContext = createContext(undefined);

/**
 * ThemeProvider component that wraps the app and provides theme state.
 * It sets a data attribute on the <html> element to allow CSS custom property overrides.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light'); // default to light

  // Load persisted theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
    } else {
      // Optional: Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Whenever theme changes, update <html> attribute and persist
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook to consume the ThemeContext */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
