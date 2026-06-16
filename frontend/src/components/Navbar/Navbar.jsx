import { Menu } from 'lucide-react';

import styles from './Navbar.module.css';

/**
 * Professional Navbar Component
 */
export default function Navbar({
  title,
  subtitle,
  onMenuToggle,
}) {

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

      <div className={styles.navbar__actions}>
      </div>
    </header>
  );
}