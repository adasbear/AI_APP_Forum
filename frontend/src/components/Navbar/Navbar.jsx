import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  LogOut,
  Sparkles,
  Moon,
  Sun,
  Menu,
} from 'lucide-react';

import styles from './Navbar.module.css';
import { useTheme } from '../../contexts/ThemeContext.jsx';

/**
 * Professional Navbar Component
 */
export default function Navbar({
  title,
  subtitle,
  user,
  onLogout,
  onMenuToggle,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const { theme, toggleTheme } = useTheme();

  // Initialize search term from URL
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('q') || params.get('semantic') || '';
  });

  // Sync search with URL
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      const params = new URLSearchParams(location.search);

      setSearchTerm(
        params.get('q') || params.get('semantic') || ''
      );
    } else {
      setSearchTerm('');
    }
  }, [location.search, location.pathname]);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim() !== '') {
        navigate(`/dashboard?q=${encodeURIComponent(searchTerm)}`);
      } else if (
        location.pathname === '/dashboard' &&
        !new URLSearchParams(location.search).get('semantic')
      ) {
        navigate('/dashboard');
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, navigate, location.pathname, location.search]);

  const handleSemanticSearch = e => {
    e.preventDefault();

    if (searchTerm.trim().length >= 3) {
      navigate(
        `/dashboard?semantic=${encodeURIComponent(searchTerm)}`
      );
    }
  };

  const handleSearchSubmit = e => {
    e.preventDefault();

    if (searchTerm.trim()) {
      navigate(`/dashboard?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <header className={styles.navbar}>
      {/* Mobile Menu */}
      <button
        className={styles.menuToggle}
        onClick={onMenuToggle}
        aria-label='Open menu'
      >
        <Menu size={24} />
      </button>

      {/* Title */}
      <div className={styles.navbar__titleBlock}>
        <h2 className={styles.navbar__pageTitle}>
          {title}
        </h2>

        {subtitle ? (
          <p className={styles.navbar__pageSubtitle}>
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Search */}
      <form
        className={styles.navbar__search}
        onSubmit={handleSearchSubmit}
      >
        <div className={styles.navbar__searchIcon}>
          <Search size={16} />
        </div>

        <input
          id='search'
          type='text'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder='Search questions by keyword...'
          className={styles.navbar__searchInput}
          aria-label='Search questions'
        />

        {searchTerm.length >= 3 && (
          <button
            type='button'
            onClick={handleSemanticSearch}
            className={styles.navbar__semanticButton}
            title='Use AI Semantic Search'
          >
            <Sparkles size={14} />

            <span className={styles.navbar__semanticText}>
              AI Search
            </span>
          </button>
        )}
      </form>

      {/* Actions */}
      <div className={styles.navbar__actions}>
        {/* Professional Theme Toggle */}
        <button
          type='button'
          className={`${styles.themeToggle} ${theme === 'dark'
              ? styles.dark
              : styles.light
            }`}
          onClick={toggleTheme}
          aria-label='Toggle theme'
          title='Toggle dark / light mode'
        >
          <div className={styles.themeToggleTrack}>
            <div className={styles.themeToggleThumb}>
              {theme === 'light' ? (
                <Moon
                  size={16}
                  className={styles.themeIcon}
                />
              ) : (
                <Sun
                  size={16}
                  className={styles.themeIcon}
                />
              )}
            </div>

            <div className={styles.themeToggleBgIcons}>
              <Sun
                size={14}
                className={styles.sunIcon}
              />

              <Moon
                size={14}
                className={styles.moonIcon}
              />
            </div>
          </div>
        </button>

        {/* User */}
        <div className={styles.navbar__user}>
          <a
            href='/profile'
            className={styles.navbar__userLink}
          >
            <span className={styles.navbar__userName}>
              {user
                ? `${user.firstName} ${user.lastName}`
                : 'Guest'}
            </span>

            <div className={styles.navbar__userAvatar}>
              <img
                src={
                  (user?.avatarUrl || user?.avatar_url)
                    ? `${import.meta.env.VITE_API_URL || 'http://localhost:3777'}${user?.avatarUrl || user?.avatar_url}`
                    : `https://ui-avatars.com/api/?name=${user?.firstName || 'User'
                      }+${user?.lastName || ''}&background=random`
                }
                alt='avatar'
                referrerPolicy='no-referrer'
              />
            </div>
          </a>
        </div>

        {/* Logout */}
        {user && (
          <button
            type='button'
            className={styles.navbar__logout}
            onClick={onLogout}
            aria-label='Logout'
            title='Logout'
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </header>
  );
}