import React from 'react';

// Define the Profile type locally (or import from a shared types file)
interface Profile {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
  nativeLanguage?: string | null;
  learningLanguages?: string[];
  country?: string | null;
  bio?: string | null;
  interests?: string[];
  xp?: number;
  streak?: number;
}

interface ProfileCardProps {
  profile: Profile;
  onEdit: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onEdit }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-2xl font-bold text-gray-600">
          {profile.user.avatarUrl ? (
            <img
              src={profile.user.avatarUrl}
              alt={profile.user.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            profile.user.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{profile.user.name}</h2>
          <p className="text-gray-600">{profile.user.email}</p>
        </div>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Edit Profile
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-500">Native Language</p>
          <p className="font-medium">{profile.nativeLanguage || 'Not set'}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-500">Learning</p>
          <p className="font-medium">
            {profile.learningLanguages?.length
              ? profile.learningLanguages.join(', ')
              : 'Not set'}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-500">Country</p>
          <p className="font-medium">{profile.country || 'Not set'}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-500">XP</p>
          <p className="font-medium">{profile.xp || 0}</p>
        </div>
      </div>

      {profile.bio && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-500">Bio</p>
          <p className="font-medium">{profile.bio}</p>
        </div>
      )}

      {profile.interests?.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-500">Interests</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {profile.interests.map((interest, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};