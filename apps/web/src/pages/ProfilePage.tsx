import React, { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { ProfileCard } from '../components/profile/ProfileCard';
import { EditProfileForm } from '../components/profile/EditProfileForm';
import { useAuth } from '../contexts/AuthContext';

export const ProfilePage = () => {
  const { user } = useAuth();
  const { profile, isLoading, error } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {isEditing ? (
          <EditProfileForm
            profile={profile}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => setIsEditing(false)}
          />
        ) : (
          <ProfileCard profile={profile} onEdit={() => setIsEditing(true)} />
        )}
      </div>
    </div>
  );
};