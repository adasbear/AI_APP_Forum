/**
 * PasswordStrengthIndicator
 * Shows a segmented bar (Weak → Fair → Good → Strong) and a live
 * checklist of all password requirements.
 */
import styles from './PasswordStrengthIndicator.module.css';

const LEVELS = ['Weak', 'Fair', 'Good', 'Strong'];

const CHECKS = [
  { key: 'length',    label: 'At least 8 characters',          test: p => p.length >= 8 },
  { key: 'upper',     label: 'At least one uppercase letter',   test: p => /[A-Z]/.test(p) },
  { key: 'lower',     label: 'At least one lowercase letter',   test: p => /[a-z]/.test(p) },
  { key: 'number',    label: 'At least one number',             test: p => /[0-9]/.test(p) },
  { key: 'special',   label: 'At least one special character',  test: p => /[^A-Za-z0-9]/.test(p) },
];

/**
 * Returns a score 0–4 based on how many criteria are met.
 */
function getScore(password) {
  if (!password) return 0;
  return CHECKS.filter(c => c.test(password)).length;
}

export default function PasswordStrengthIndicator({ password }) {
  const score = getScore(password);

  // 0 = empty, 1 = Weak, 2 = Fair, 3 = Good, 4 = Strong
  // Map score 1–5 → label index 0–3 (clamp to 0..3)
  const levelIndex = Math.min(Math.max(score - 1, 0), 3);
  const levelLabel = password.length > 0 ? LEVELS[levelIndex] : '';

  if (!password) return null;

  return (
    <div className={styles.psi} role='status' aria-live='polite' aria-label={`Password strength: ${levelLabel}`}>
      {/* Segmented bar */}
      <div className={styles.psi__bar} aria-hidden='true'>
        {LEVELS.map((_, i) => (
          <div
            key={i}
            className={`${styles.psi__segment} ${i < score ? styles[`psi__segment--${LEVELS[Math.min(score - 1, 3)].toLowerCase()}`] : ''}`}
          />
        ))}
      </div>

      {/* Strength label */}
      {levelLabel && (
        <span className={`${styles.psi__label} ${styles[`psi__label--${levelLabel.toLowerCase()}`]}`}>
          {levelLabel}
        </span>
      )}

      {/* Checklist */}
      <ul className={styles.psi__list} aria-label='Password requirements'>
        {CHECKS.map(c => {
          const met = c.test(password);
          return (
            <li key={c.key} className={`${styles.psi__item} ${met ? styles['psi__item--met'] : ''}`}>
              <span className={styles.psi__icon} aria-hidden='true'>
                {met ? '✓' : '○'}
              </span>
              {c.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
