import React, { useState, useEffect } from 'react';
import { AudioControls } from './AudioControls';
import { useVoiceRoom, useLiveKitRoom } from '../../hooks/useVoice';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface VoiceCallProps {
  roomId: string;
  onEnd: () => void;
  isIncoming?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
}

export const VoiceCall: React.FC<VoiceCallProps> = ({
  roomId,
  onEnd,
  isIncoming = false,
  onAccept,
  onDecline,
}) => {
  const { user } = useAuth();
  const { data: room, isLoading } = useVoiceRoom(roomId);
  const [token, setToken] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [caller, setCaller] = useState<{ name: string; avatarUrl?: string } | null>(null);

  // Get LiveKit token
  useEffect(() => {
    if (!roomId) return;
    // For 1-on-1 calls, we can use the room join endpoint
    const getToken = async () => {
      try {
        const res = await voiceApi.joinRoom(roomId);
        setToken(res.data.token);
        setIsCallActive(true);
      } catch (error) {
        toast.error('Failed to join call');
        onEnd();
      }
    };
    getToken();
  }, [roomId]);

  // LiveKit connection
  const { isConnected, toggleMute, isMuted, error } = useLiveKitRoom(
    room?.liveKitRoomId || '',
    token
  );

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const handleEndCall = () => {
    setIsCallActive(false);
    onEnd();
  };

  const handleAnswer = () => {
    if (onAccept) onAccept();
    setIsCallActive(true);
  };

  const handleDecline = () => {
    if (onDecline) onDecline();
    onEnd();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading call...</div>;
  }

  if (!room) {
    return <div className="p-6 text-center text-red-500">Call not found</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
      {/* Avatar and caller info */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-4xl font-bold mx-auto mb-4">
          {room.participants.find((p) => p.userId !== user?.id)?.user.avatarUrl ? (
            <img
              src={room.participants.find((p) => p.userId !== user?.id)?.user.avatarUrl}
              alt="Caller"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            room.participants
              .find((p) => p.userId !== user?.id)
              ?.user.name.charAt(0)
              .toUpperCase() || '?'
          )}
        </div>
        <h2 className="text-2xl font-bold">
          {room.participants.find((p) => p.userId !== user?.id)?.user.name || 'Unknown'}
        </h2>
        <p className="text-gray-400">
          {isIncoming ? 'Incoming call...' : isCallActive ? formatDuration(duration) : 'Connecting...'}
        </p>
      </div>

      {/* Controls */}
      <AudioControls
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isCallActive={isCallActive}
        onEndCall={handleEndCall}
        isCallIncoming={isIncoming}
        onAnswerCall={handleAnswer}
      />

      {/* Decline button (for incoming) */}
      {isIncoming && (
        <button
          onClick={handleDecline}
          className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
        >
          Decline
        </button>
      )}
    </div>
  );
};