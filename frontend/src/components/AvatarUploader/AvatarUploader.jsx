import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { authService } from '../../services/auth/auth.service';
import { useToast } from '../../contexts/ToastContext';
import styles from './AvatarUploader.module.css';

export default function AvatarUploader({ currentAvatar, onUpdate }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', message: 'Please select an image file.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addToast({ type: 'error', message: 'Image must be smaller than 2MB.' });
      return;
    }

    setUploading(true);
    try {
      const newUrl = await authService.uploadAvatar(file);
      onUpdate(newUrl);
      addToast({ type: 'success', message: 'Avatar updated!' });
    } catch (error) {
      addToast({ type: 'error', message: error.message || 'Upload failed' });
    } finally {
      setUploading(false);
      // clear input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.avatarWrapper}>
        <img 
          src={currentAvatar} 
          alt="User Avatar" 
          className={styles.avatarImage} 
          style={{ opacity: uploading ? 0.5 : 1 }}
        />
        <button 
          type="button"
          className={styles.uploadButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Upload new avatar"
        >
          <Camera size={24} />
        </button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className={styles.hiddenInput}
      />
    </div>
  );
}
