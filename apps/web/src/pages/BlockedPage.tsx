import React from 'react';
import { useBlockedUsers, useUnblockUser } from '../hooks/useFriends';
import { toast } from 'sonner';

export const BlockedPage = () => {
  const { data, isLoading } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  const handleUnblock = async (userId: string) => {
    try {
      await unblockMutation.mutateAsync(userId);
      toast.success('User unblocked');
    } catch {
      toast.error('Failed to unblock user');
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Blocked Users</h1>
      {!data || data.length === 0 ? (
        <p className="text-gray-500">No blocked users.</p>
      ) : (
        <div className="space-y-2">
          {data.map((block) => (
            <div key={block.id} className="border p-3 rounded flex justify-between items-center">
              <span>{block.blocked.name}</span>
              {block.reason && <span className="text-sm text-gray-500">Reason: {block.reason}</span>}
              <button
                onClick={() => handleUnblock(block.blocked.id)}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};