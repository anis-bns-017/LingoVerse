import React, { useState } from 'react';
import { useVoiceRooms, useCreateVoiceRoom, useJoinVoiceRoom, useEndVoiceRoom } from '../hooks/useVoice';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const VoicePage = () => {
  const { user } = useAuth();
  const { data: rooms, isLoading, refetch } = useVoiceRooms();
  const createRoom = useCreateVoiceRoom();
  const joinRoom = useJoinVoiceRoom();
  const endRoom = useEndVoiceRoom();

  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'OPEN',
    maxParticipants: 50,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRoom.mutateAsync(formData);
    setShowCreate(false);
    setFormData({ name: '', description: '', type: 'OPEN', maxParticipants: 50 });
  };

  const handleJoin = async (roomId: string) => {
    await joinRoom.mutateAsync(roomId);
  };

  const handleEnd = async (roomId: string) => {
    if (window.confirm('End this room?')) {
      await endRoom.mutateAsync(roomId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Voice Rooms</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Room
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-50 p-4 rounded mb-4 border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Room Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="OPEN">Open</option>
                <option value="PRIVATE">Private</option>
                <option value="STAGE">Stage</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Max Participants</label>
              <input
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 50 })}
                className="w-full px-3 py-2 border rounded"
                min={2}
                max={100}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded">
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading && <div>Loading rooms...</div>}

      <div className="space-y-3">
        {rooms?.map((room) => (
          <div key={room.id} className="border p-4 rounded shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{room.name}</h3>
                <p className="text-sm text-gray-600">{room.description}</p>
                <div className="text-xs text-gray-400 mt-1">
                  {room.type} • {room.status} • {room.participants.length} participants
                </div>
              </div>
              <div className="flex gap-2">
                {room.status !== 'ENDED' && (
                  <>
                    <button
                      onClick={() => handleJoin(room.id)}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Join
                    </button>
                    {room.creatorId === user?.id && (
                      <button
                        onClick={() => handleEnd(room.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        End
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};