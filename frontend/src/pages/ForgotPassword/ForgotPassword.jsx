/**
 * ForgotPassword page
 *
 * Accepts an email address, calls POST /api/auth/forgot-password, and
 * always displays a generic success message regardless of whether the
 * email is in the system — preventing user enumeration.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { MessageSquare, ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { authService } from '../../services/auth/auth.service.js';
import styles from './ForgotPassword.module.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }
    if (!emailPattern.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(normalizedEmail);
      // Always show success regardless of server response details
      setSubmitted(true);
    } catch (err) {
      // Show generic error only for network/server failures, not user existence
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Left: branding panel — mirrors Auth.jsx layout */}
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
              <Mail size={28} />
            </div>
            <h2 className={styles.panelHeading}>Password reset</h2>
            <p className={styles.panelText}>
              Enter the email address linked to your account and we'll send you a
              secure reset link — valid for 15 minutes.
            </p>
            <p className={styles.panelText}>
              For your security, we won't confirm whether an account exists for the
              address you enter.
            </p>
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
            {submitted ? (
              /* Success state */
              <div className={styles.successState}>
                <div className={styles.successIcon} aria-hidden>✓</div>
                <h2 className={styles.formTitle}>Check your inbox</h2>
                <p className={styles.formSubtitle}>
                  If an account exists for <strong>{email.trim().toLowerCase()}</strong>,
                  we've sent a password reset link. It expires in 15 minutes.
                </p>
                <p className={styles.formSubtitle}>
                  Don't see it? Check your spam folder.
                </p>
                <button
                  className={`${styles.button} ${styles['button--primary']}`}
                  onClick={() => navigate('/auth')}
                >
                  Back to sign in
                  <ArrowRight size={16} className={styles.buttonIcon} />
                </button>
              </div>
            ) : (
              /* Email form */
              <>
                <div className={styles.formHeader}>
                  <h2 className={styles.formTitle}>Forgot your password?</h2>
                  <p className={styles.formSubtitle}>
                    Enter your email address below to receive a reset link.
                  </p>
                </div>

                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  <div className={styles.inputGroup}>
                    <label htmlFor="email" className={styles.label}>
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      className={styles.input}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  {error && <div className={styles.error}>{error}</div>}

                  <div className={styles.buttonContainer}>
                    <button
                      type="submit"
                      className={`${styles.button} ${styles['button--primary']}`}
                      disabled={loading}
                    >
                      {loading ? 'Sending...' : 'Send Reset Link'}
                      {!loading && (
                        <ArrowRight size={16} className={styles.buttonIcon} />
                      )}
                    </button>
                  </div>
                </form>

                <footer className={styles.formFooter}>
                  <button
                    className={styles.backLink}
                    onClick={() => navigate('/auth')}
                  >
                    <ArrowLeft size={14} />
                    Back to sign in
                  </button>
                </footer>
              </>
            )}
          </Motion.div>
        </div>
      </section>
    </div>
  );
}
