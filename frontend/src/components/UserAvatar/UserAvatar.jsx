/**
 * UserAvatar — shared avatar component.
 *
 * Props:
 *   user / author  — object with { firstName, lastName, avatarUrl?, avatar_url? }
 *                    Accepts either prop name for flexibility.
 *   size           — pixel size of the circle (default 36)
 *   className      — optional extra class on the root element
 *
 * Behaviour:
 *   • If the user has an avatar URL → shows the image.
 *   • If the image fails to load → falls back to initials.
 *   • If no avatar URL → shows initials with a deterministic colour
 *     derived from the name (same person = same colour, always).
 */

import { useState } from 'react';
import styles from './UserAvatar.module.css';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3777';

/* ── helpers ── */

function resolveAvatarUrl(person) {
  const raw = person?.avatarUrl || person?.avatar_url;
  if (!raw) return null;
  return raw.startsWith('http') ? raw : `${BACKEND_URL}${raw}`;
}

/**
 * Deterministic hue: same name string → same colour, every time.
 * Uses a simple djb2-style hash mapped onto HSL.
 */
function nameToColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 46%)`;
}

function getInitials(firstName = '', lastName = '') {
  return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';
}

/* ── component ── */

export default function UserAvatar({ user, author, size = 36, className = '' }) {
  const person = user || author || {};
  const firstName = person.firstName || person.first_name || '';
  const lastName  = person.lastName  || person.last_name  || '';

  const avatarUrl = resolveAvatarUrl(person);
  const initials  = getInitials(firstName, lastName);
  const bgColor   = nameToColor(`${firstName}${lastName}`);

  // Falls back to initials if the image 404s
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = avatarUrl && !imgFailed;

  const sizeStyle = {
    width:  size,
    height: size,
    flexShrink: 0,
  };

  if (showImage) {
    return (
      <img
        src={avatarUrl}
        alt={`${firstName} ${lastName}`.trim() || 'User avatar'}
        className={`${styles.avatar} ${className}`}
        style={sizeStyle}
        referrerPolicy='no-referrer'
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className={`${styles.initials} ${className}`}
      style={{
        ...sizeStyle,
        background: bgColor,
        fontSize: Math.round(size * 0.38),
      }}
      aria-label={`${firstName} ${lastName}`.trim() || 'User'}
      role='img'
    >
      {initials}
    </span>
  );
}
