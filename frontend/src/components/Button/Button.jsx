import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

/**
 * Enhanced Button Component with Premium Loading Animations
 * 
 * @param {Object} props
 * @param {'primary'|'secondary'|'ai'|'danger'|'ghost'} props.variant - Button style variant
 * @param {'small'|'medium'|'large'} props.size - Button size
 * @param {boolean} props.isLoading - Loading state
 * @param {boolean} props.disabled - Disabled state
 * @param {React.ReactNode} props.children - Button content
 * @param {React.ReactNode} props.icon - Icon element (optional)
 * @param {React.ReactNode} props.loadingText - Text to show while loading (optional)
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onClick - Click handler
 * @param {'button'|'submit'|'reset'} props.type - Button type
 */
export default function Button({
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  children,
  icon,
  loadingText,
  className = '',
  onClick,
  type = 'button',
  ...rest
}) {
  const isAI = variant === 'ai';
  const isDisabled = disabled || isLoading;

  const buttonClasses = [
    styles.button,
    styles[`button--${variant}`],
    styles[`button--${size}`],
    isLoading && styles['button--loading'],
    isLoading && isAI && styles['button--loadingAI'],
    isDisabled && styles['button--disabled'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading}
      {...rest}
    >
      {/* Loading State */}
      {isLoading && (
        <span className={styles.buttonLoader}>
          {isAI ? (
            // AI buttons get sparkle shimmer animation (no spinner)
            <span className={styles.aiShimmer} aria-hidden="true" />
          ) : (
            // Standard buttons get spinning loader
            <Loader2 
              className={styles.spinnerIcon} 
              size={size === 'small' ? 14 : size === 'large' ? 20 : 16}
              aria-hidden="true"
            />
          )}
        </span>
      )}

      {/* Button Content */}
      <span className={styles.buttonContent}>
        {icon && !isLoading && (
          <span className={styles.buttonIcon} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={styles.buttonText}>
          {isLoading && loadingText ? loadingText : children}
        </span>
      </span>

      {/* AI Gradient Overlay (only for AI variant when loading) */}
      {isAI && isLoading && (
        <span className={styles.aiGradientOverlay} aria-hidden="true" />
      )}
    </button>
  );
}
