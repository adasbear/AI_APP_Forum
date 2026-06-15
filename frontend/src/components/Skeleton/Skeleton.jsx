import React from 'react';
import styles from './Skeleton.module.css';

/**
 * Reusable Skeleton component for loading states.
 * 
 * @param {string} variant - 'text' | 'avatar' | 'card'
 * @param {string} width - CSS width (e.g., '100%', '200px')
 * @param {string} height - CSS height
 * @param {string} className - Optional extra class
 */
export default function Skeleton({ variant = 'text', width, height, className = '' }) {
  const customStyles = {};
  if (width) customStyles.width = width;
  if (height) customStyles.height = height;

  return (
    <div 
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={customStyles}
      aria-hidden="true"
    />
  );
}
