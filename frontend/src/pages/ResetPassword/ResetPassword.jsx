/**
 * ResetPassword page
 *
 * Reads the `token` query parameter from the URL, collects a new password
 * and confirmation, then calls POST /api/auth/reset-password.
 * Redirects to /auth after success.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { MessageSquare, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/auth/auth.service.js';
import PasswordStrengthIndicator from '../../components/PasswordStrengthIndicator/PasswordStrengthIndicator.jsx';
import styles from './ResetPassword.module.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Pull token from URL on mount; redirect if missing
  useEffect(() => {
    const rawToken = searchParams.get('token');
    if (!rawToken) {
      navigate('/auth', { replace: true });
      return;
    }
    setToken(rawToken);
  }, [searchParams, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!newPassword.trim()) {
      setError('New password is required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one number.');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Password must contain at least one special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({ token, newPassword });
      setSuccess(true);
      // Redirect to login after a short delay so user can read the success message
      setTimeout(() => navigate('/auth', { replace: true }), 2500);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Left: branding panel */}
      <section className={styles.panel}>
        <div className={styles.panelContent}>
          <div
            className={styles.branding}
            onClick={() => navigate('/')}
            role="button"
            tabIndex={0}
            title="Go to Home"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/');
              }
            }}
          >
            <div className={styles.logoWrap} aria-hidden>
              <MessageSquare className={styles.logoIcon} size={22} />
            </div>
            <div className={styles.brandCopy}>
              <p className={styles.brandTitle}>Evangadi Forum</p>
              <p className={styles.brandTagline}>Learn together. Ask with context.</p>
            </div>
          </div>

          <div className={styles.panelBody}>
            <div className={styles.iconCircle} aria-hidden>
              <ShieldCheck size={28} />
            </div>
            <h2 className={styles.panelHeading}>Choose a strong password</h2>
            <ul className={styles.ruleList}>
              <li>At least 8 characters</li>
              <li>One uppercase letter (A–Z)</li>
              <li>One lowercase letter (a–z)</li>
              <li>One number (0–9)</li>
              <li>One special character (!@#$ …)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Right: form */}
      <section className={styles.formSection}>
        <div className={styles.formContainer}>
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {success ? (
              /* Success state */
              <div className={styles.successState}>
                <div className={styles.successIcon} aria-hidden>✓</div>
                <h2 className={styles.formTitle}>Password updated</h2>
                <p className={styles.formSubtitle}>
                  Your password has been changed successfully. Redirecting you to
                  sign in…
                </p>
              </div>
            ) : (
              <>
                <div className={styles.formHeader}>
                  <h2 className={styles.formTitle}>Reset your password</h2>
                  <p className={styles.formSubtitle}>
                    Enter and confirm your new password below.
                  </p>
                </div>

                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  {/* New password */}
                  <div className={styles.inputGroup}>
                    <label htmlFor="newPassword" className={styles.label}>
                      New Password
                    </label>
                    <div className={styles.passwordWrap}>
                      <input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={`${styles.input} ${styles.inputPassword}`}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <EyeOff size={18} aria-hidden />
                        ) : (
                          <Eye size={18} aria-hidden />
                        )}
                      </button>
                    </div>
                    <PasswordStrengthIndicator password={newPassword} />
                  </div>

                  {/* Confirm password */}
                  <div className={styles.inputGroup}>
                    <label htmlFor="confirmPassword" className={styles.label}>
                      Confirm New Password
                    </label>
                    <div className={styles.passwordWrap}>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={`${styles.input} ${styles.inputPassword}`}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={
                          showConfirmPassword ? 'Hide password' : 'Show password'
                        }
                        aria-pressed={showConfirmPassword}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} aria-hidden />
                        ) : (
                          <Eye size={18} aria-hidden />
                        )}
                      </button>
                    </div>
                    {/* Inline match indicator */}
                    {confirmPassword.length > 0 && (
                      <p
                        className={
                          newPassword === confirmPassword
                            ? styles.matchOk
                            : styles.matchError
                        }
                      >
                        {newPassword === confirmPassword
                          ? '✓ Passwords match'
                          : '✗ Passwords do not match'}
                      </p>
                    )}
                  </div>

                  {error && <div className={styles.error}>{error}</div>}

                  <div className={styles.buttonContainer}>
                    <button
                      type="submit"
                      className={`${styles.button} ${styles['button--primary']}`}
                      disabled={loading}
                    >
                      {loading ? 'Updating password…' : 'Reset Password'}
                      {!loading && (
                        <ArrowRight size={16} className={styles.buttonIcon} />
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </Motion.div>
        </div>
      </section>
    </div>
  );
}
