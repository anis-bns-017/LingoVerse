import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';

interface AudioControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  isDeafened?: boolean;
  onToggleDeafen?: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  onEndCall?: () => void;
  onAnswerCall?: () => void;
  isCallIncoming?: boolean;
  isCallActive?: boolean;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isMuted,
  onToggleMute,
  isDeafened = false,
  onToggleDeafen,
  volume = 80,
  onVolumeChange,
  onEndCall,
  onAnswerCall,
  isCallIncoming = false,
  isCallActive = false,
}) => {
  return (
    <div className="flex items-center gap-4 bg-gray-900 text-white p-4 rounded-full shadow-lg">
      {/* Mute button */}
      <button
        onClick={onToggleMute}
        className={`p-3 rounded-full transition-colors ${
          isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
        }`}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
      </button>

      {/* Deafen button (optional) */}
      {onToggleDeafen && (
        <button
          onClick={onToggleDeafen}
          className={`p-3 rounded-full transition-colors ${
            isDeafened ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      )}

      {/* Volume slider */}
      {onVolumeChange && (
        <div className="flex items-center gap-2">
          <Volume2 size={18} className="text-gray-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(parseInt(e.target.value))}
            className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}

      {/* Call actions */}
      {isCallIncoming && onAnswerCall && (
        <button
          onClick={onAnswerCall}
          className="p-3 rounded-full bg-green-600 hover:bg-green-700 transition-colors"
          aria-label="Answer call"
        >
          <Phone size={24} />
        </button>
      )}

      {isCallActive && onEndCall && (
        <button
          onClick={onEndCall}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
          aria-label="End call"
        >
          <PhoneOff size={24} />
        </button>
      )}
    </div>
  );
};