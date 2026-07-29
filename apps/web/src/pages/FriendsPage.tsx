import React, { useState } from 'react';
import {
  useFriends,
  useFriendRequests,
  useRespondFriendRequest,
  useBlockUser,
} from '../hooks/useFriends';
import { toast } from 'sonner';

export const FriendsPage = () => {
  const [search, setSearch] = useState('');
  const { data: friends, isLoading: friendsLoading } = useFriends(search);
  const { data: requests, isLoading: requestsLoading } = useFriendRequests();
  const respondMutation = useRespondFriendRequest();
  const blockMutation = useBlockUser();

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await respondMutation.mutateAsync({ requestId, action });
      toast.success(action === 'accept' ? 'Friend request accepted!' : 'Request rejected');
    } catch {
      toast.error('Failed to respond');
    }
  };

  const handleBlock = async (userId: string) => {
    if (confirm('Block this user?')) {
      try {
        await blockMutation.mutateAsync({ userId });
        toast.success('User blocked');
      } catch {
        toast.error('Failed to block user');
      }
    }
  };

  if (friendsLoading || requestsLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Friends</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {/* Friend Requests */}
      {requests && requests.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Friend Requests</h2>
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="border p-3 rounded flex justify-between items-center">
                <span>{req.fromUser.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(req.id, 'accept')}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'reject')}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleBlock(req.fromUser.id)}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
                  >
                    Block
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <h2 className="text-lg font-semibold mb-2">Your Friends</h2>
      {friends && friends.items.length === 0 ? (
        <p className="text-gray-500">No friends yet. Connect with others!</p>
      ) : (
        <div className="space-y-2">
          {friends?.items.map((friend) => (
            <div key={friend.id} className="border p-3 rounded flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {friend.user.avatarUrl ? (
                    <img
                      src={friend.user.avatarUrl}
                      alt={friend.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold">{friend.user.name.charAt(0)}</span>
                  )}
                </div>
                <span>{friend.user.name}</span>
              </div>
              <button
                onClick={() => handleBlock(friend.user.id)}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
              >
                Block
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};