import React, { useState, useEffect } from 'react';
// useOutletContext removed
import { authService } from '../../services/auth/auth.service.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import AvatarUploader from '../../components/AvatarUploader/AvatarUploader.jsx';
import styles from './Profile.module.css';
import Skeleton from '../../components/Skeleton/Skeleton.jsx';

export default function Profile() {
  const { addToast } = useToast();
  const { updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);



  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await authService.getProfile();
        setProfile(data);
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          bio: data.bio || '',
        });
      } catch (err) {
        addToast({ type: 'error', message: err.message || 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [addToast]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await authService.updateProfile({ ...formData, avatarUrl: profile.avatarUrl });
      setProfile(updated);
      updateUser({ 
        firstName: updated.firstName, 
        lastName: updated.lastName, 
        avatar_url: updated.avatarUrl 
      });
      addToast({ type: 'success', message: 'Profile updated successfully' });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpdate = (newUrl) => {
    setProfile((prev) => ({ ...prev, avatarUrl: newUrl }));
  };

  const handlePasswordChange = (e) => {
    setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      addToast({ type: 'success', message: 'Password changed successfully' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerCard}>
          <Skeleton variant="avatar" width="120px" height="120px" />
          <div className={styles.headerInfo}>
            <Skeleton variant="text" width="200px" height="32px" />
            <Skeleton variant="text" width="150px" height="20px" />
          </div>
        </div>
        <div className={styles.formCard}>
          <Skeleton variant="card" height="300px" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3777';
  const displayAvatar = profile.avatarUrl 
    ? `${backendUrl}${profile.avatarUrl}` 
    : `https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=random&size=150`;

  return (
    <div className={styles.container}>
      <div className={styles.headerCard}>
        <AvatarUploader 
          currentAvatar={displayAvatar} 
          onUpdate={handleAvatarUpdate} 
        />
        <div className={styles.headerInfo}>
          <h2 className={styles.name}>{profile.firstName} {profile.lastName}</h2>
          <p className={styles.email}>{profile.email}</p>
          <div className={styles.stats}>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{profile.questionsAsked}</span>
              <span className={styles.statLabel}>Questions</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{profile.answersGiven}</span>
              <span className={styles.statLabel}>Answers</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.formCard}>
        <h3 className={styles.formTitle}>Edit Profile</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Tell us about yourself..."
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitBtn} 
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className={styles.formCard} style={{ marginTop: '20px' }}>
        <h3 className={styles.formTitle}>Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
          </div>
          <button 
            type="submit" 
            className={styles.submitBtn} 
            disabled={changingPassword}
          >
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
