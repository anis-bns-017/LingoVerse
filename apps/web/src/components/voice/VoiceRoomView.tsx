import React, { useEffect, useRef } from 'react';
import { useLiveKitRoom, useVoiceRoom } from '../../hooks/useVoice';
import { useAuth } from '../../contexts/AuthContext';
import { Participant } from 'livekit-client';

interface VoiceRoomViewProps {
  roomId: string;
  onLeave: () => void;
}

export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({ roomId, onLeave }) => {
  const { user } = useAuth();
  const { data: room, isLoading } = useVoiceRoom(roomId);
  const [token, setToken] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Actually join the room via API to get token
  useEffect(() => {
    const getToken = async () => {
      try {
        const res = await voiceApi.joinRoom(roomId);
        setToken(res.data.token);
      } catch (error) {
        console.error('Failed to get token', error);
      }
    };
    if (roomId) getToken();
  }, [roomId]);

  const { room: livekitRoom, localTrack, remoteTracks } = useLiveKitRoom(
    room?.liveKitRoomId || '',
    token
  );

  // Audio element for remote tracks
  useEffect(() => {
    if (audioRef.current) {
      // Attach remote tracks to audio element
      remoteTracks.forEach((track) => {
        // Implement attachment logic
      });
    }
  }, [remoteTracks]);

  if (isLoading) return <div>Loading room...</div>;
  if (!room) return <div>Room not found</div>;

  return (
    <div className="p-4 border rounded">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{room.name}</h2>
        <button
          onClick={onLeave}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Leave
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {room.participants.map((p) => (
          <div key={p.id} className="bg-gray-100 p-2 rounded text-center">
            <div className="font-medium">{p.user.name}</div>
            <div className="text-xs text-gray-500">{p.role}</div>
            {p.isMuted && <span className="text-red-500 text-xs">🔇</span>}
            {p.raisedHand && <span className="text-yellow-500 text-xs">✋</span>}
          </div>
        ))}
      </div>

      <audio ref={audioRef} autoPlay />

      <div className="mt-4 flex gap-2">
        <button className="px-4 py-2 bg-gray-200 rounded">Toggle Mute</button>
        <button className="px-4 py-2 bg-gray-200 rounded">Raise Hand</button>
      </div>
    </div>
  );
};