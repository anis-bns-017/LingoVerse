import React from 'react';
import { useSuggestions, useSendFriendRequest } from '../hooks/useFriends';
import { toast } from 'sonner';

export const SuggestionsPage = () => {
  const { data, isLoading } = useSuggestions();
  const sendRequestMutation = useSendFriendRequest();

  const handleSendRequest = async (userId: string) => {
    try {
      await sendRequestMutation.mutateAsync(userId);
      toast.success('Friend request sent!');
    } catch {
      toast.error('Failed to send request');
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading suggestions...</div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-xl font-bold mb-2">No suggestions</h2>
        <p className="text-gray-600">Connect with more people to get suggestions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">People You May Know</h1>
      <div className="space-y-3">
        {data.map((user) => (
          <div key={user.id} className="border p-4 rounded shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold">{user.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <div className="font-semibold">{user.name}</div>
                {user.profile && (
                  <div className="text-sm text-gray-500">
                    {user.profile.nativeLanguage && `Native: ${user.profile.nativeLanguage}`}
                    {user.profile.learningLanguages && user.profile.learningLanguages.length > 0 && (
                      <> • Learning: {user.profile.learningLanguages.join(', ')}</>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => handleSendRequest(user.id)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Friend
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};