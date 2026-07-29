import React, { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { ProfileCard } from '../components/profile/ProfileCard';
import { EditProfileForm } from '../components/profile/EditProfileForm';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'profile' | 'stats' | 'settings';

export const ProfilePage = () => {
  const { user } = useAuth();
  const { profile, isLoading, error } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

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
      <div className="max-w-4xl mx-auto px-4">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 px-4 text-sm font-medium ${
              activeTab === 'profile'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-2 px-4 text-sm font-medium ${
              activeTab === 'stats'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Stats & Progress
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2 px-4 text-sm font-medium ${
              activeTab === 'settings'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        {activeTab === 'profile' && (
          <>
            {isEditing ? (
              <EditProfileForm
                profile={profile}
                onCancel={() => setIsEditing(false)}
                onSuccess={() => setIsEditing(false)}
              />
            ) : (
              <ProfileCard profile={profile} onEdit={() => setIsEditing(true)} />
            )}
          </>
        )}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-bold mb-4">Your Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{profile.xp || 0}</p>
                <p className="text-sm text-gray-500">Total XP</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-600">{profile.streak || 0}🔥</p>
                <p className="text-sm text-gray-500">Streak</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{profile.learningLanguages?.length || 0}</p>
                <p className="text-sm text-gray-500">Languages Learning</p>
              </div>
            </div>
            {/* Add more stats like completed exercises, etc. */}
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-xl font-bold mb-4">Settings</h3>
            <p className="text-gray-500">Account settings, notifications, privacy, etc.</p>
            {/* You can link to a separate Settings page or show a form */}
          </div>
        )}
      </div>
    </div>
  );
};