import React, { useState, useEffect, useRef } from 'react';
import { useVoiceRoom, useVoiceSocket, useLiveKitRoom, voiceApi } from '../../hooks/useVoice';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Mic, MicOff, Hand, PhoneOff, Users, 
  MessageCircle, X, Pin, Trash2, 
  UserX, VolumeX, Crown, Send,
  MoreVertical, Flag
} from 'lucide-react';

interface VoiceRoomViewProps {
  roomId: string;
  onLeave: () => void;
}

// ---- Shared theater palette ----
const COLORS = {
  void: '#0B0714',
  surface: '#1C1430',
  surfaceRaised: '#251C3E',
  border: '#322754',
  spotlight: '#F5A623',
  spotlightDim: 'rgba(245, 166, 35, 0.16)',
  live: '#2DD4BF',
  liveDim: 'rgba(45, 212, 191, 0.14)',
  textPrimary: '#F4EFFF',
  textMuted: '#9C90B8',
};

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('') || '?'
  );
}

function hueFromString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

// ---------- Chat Message Component ----------
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  isPinned: boolean;
  createdAt: Date;
  isHost?: boolean;
}

const ChatMessageBubble: React.FC<{
  message: ChatMessage;
  isOwn: boolean;
  isHost: boolean;
  onPin: () => void;
  onDelete: () => void;
  onKick: () => void;
  onMute: () => void;
}> = ({ message, isOwn, isHost, onPin, onDelete, onKick, onMute }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className="relative max-w-[80%]">
        <div
          className={`p-3 rounded-xl ${
            message.isPinned 
              ? 'border-2 border-yellow-500/40 bg-yellow-500/10' 
              : isOwn 
                ? 'bg-blue-600/30' 
                : 'bg-white/5'
          }`}
        >
          {message.isPinned && (
            <div className="flex items-center gap-1 text-xs text-yellow-400 mb-1">
              <Pin className="w-3 h-3" /> Pinned
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
              {message.userName}
            </span>
            {message.isHost && (
              <Crown className="w-3 h-3 text-yellow-400" />
            )}
            <span className="text-xs" style={{ color: COLORS.textMuted }}>
              {new Date(message.createdAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm" style={{ color: COLORS.textPrimary }}>
            {message.content}
          </p>
        </div>

        {/* Action menu - visible to host or message owner */}
        {(isHost || isOwn) && (
          <div className="absolute -top-2 -right-2">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 rounded-full bg-gray-800 hover:bg-gray-700"
            >
              <MoreVertical className="w-3 h-3" style={{ color: COLORS.textMuted }} />
            </button>
            {showActions && (
              <div className="absolute right-0 mt-1 bg-gray-800 rounded-lg shadow-lg p-1 z-10 min-w-[120px]">
                {isHost && (
                  <>
                    <button
                      onClick={() => { onPin(); setShowActions(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-700 rounded"
                      style={{ color: COLORS.textPrimary }}
                    >
                      <Pin className="w-3 h-3" /> {message.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => { onMute(); setShowActions(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-700 rounded"
                      style={{ color: COLORS.textPrimary }}
                    >
                      <VolumeX className="w-3 h-3" /> Mute
                    </button>
                    <button
                      onClick={() => { onKick(); setShowActions(false); }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-red-600/20 rounded"
                      style={{ color: '#F87171' }}
                    >
                      <UserX className="w-3 h-3" /> Kick
                    </button>
                  </>
                )}
                {isOwn && (
                  <button
                    onClick={() => { onDelete(); setShowActions(false); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-red-600/20 rounded"
                    style={{ color: '#F87171' }}
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Main Component ----------
export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({ roomId, onLeave }) => {
  const { user } = useAuth();
  const { data: room, isLoading, refetch } = useVoiceRoom(roomId);
  const [token, setToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mock chat messages - in production these come from WebSocket
  useEffect(() => {
    // Simulate initial messages
    setChatMessages([
      {
        id: '1',
        userId: 'system',
        userName: '🎙️ Host',
        content: `Welcome to "${room?.name || 'Voice Room'}"!`,
        isPinned: true,
        createdAt: new Date(),
        isHost: true,
      },
      {
        id: '2',
        userId: 'system',
        userName: '📢 Announcement',
        content: 'Speak clearly and respect others. Have fun!',
        isPinned: false,
        createdAt: new Date(),
      },
    ]);
    setPinnedMessages(new Set(['1']));
  }, [room]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Get LiveKit token
  useEffect(() => {
    const getToken = async () => {
      if (!roomId) return;
      try {
        setIsJoining(true);
        const res = await voiceApi.joinRoom(roomId);
        setToken(res.data.token);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to join room');
        onLeave();
      } finally {
        setIsJoining(false);
      }
    };
    getToken();
  }, [roomId, onLeave]);

  const { socket, participants: wsParticipants = [] } = useVoiceSocket(roomId, user?.id || '');

  const liveKitRoomId = room?.liveKitRoomId || '';
  const {
    isConnected,
    participants: livekitParticipants = [],
    remoteTracks = {},
    toggleMute,
    isMuted,
    error,
  } = useLiveKitRoom(
    liveKitRoomId,
    token,
    (identity) => console.log('Participant joined:', identity),
    (identity) => console.log('Participant left:', identity),
  );

  // ---- Host Controls ----
  const isHost = room?.creatorId === user?.id;

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      userId: user?.id || 'unknown',
      userName: user?.name || 'Anonymous',
      content: newMessage.trim(),
      isPinned: false,
      createdAt: new Date(),
      isHost: isHost,
    };
    setChatMessages([...chatMessages, msg]);
    setNewMessage('');
    // In production, emit to WebSocket
    if (socket) {
      socket.emit('voice:chat', { roomId, message: msg });
    }
  };

  const handlePinMessage = (messageId: string) => {
    setChatMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, isPinned: !msg.isPinned }
          : msg
      )
    );
    const msg = chatMessages.find(m => m.id === messageId);
    if (msg) {
      toast.success(msg.isPinned ? 'Message unpinned' : 'Message pinned');
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setChatMessages(prev => prev.filter(m => m.id !== messageId));
    toast.success('Message deleted');
  };

  const handleKickUser = (userId: string) => {
    if (!isHost) {
      toast.error('Only the host can kick members');
      return;
    }
    // In production, call API to kick user
    toast.success('User kicked from room');
    // Emit to WebSocket
    if (socket) {
      socket.emit('voice:kick', { roomId, userId });
    }
  };

  const handleMuteUser = (userId: string) => {
    if (!isHost) {
      toast.error('Only the host can mute members');
      return;
    }
    // In production, call API to mute user via LiveKit
    toast.success('User muted');
    if (socket) {
      socket.emit('voice:mute-user', { roomId, userId });
    }
  };

  const handleRaiseHand = () => {
    if (socket) {
      socket.emit('voice:raise-hand', { roomId, raise: true });
      toast.success("Hand raised — you're in the queue");
    }
  };

  const handleLeave = async () => {
    try {
      await voiceApi.leaveRoom(roomId);
      socket?.emit('voice:leave', { roomId });
      toast.success('Left room');
      onLeave();
    } catch {
      toast.error('Failed to leave');
    }
  };

  if (isLoading || isJoining) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans"
        style={{ background: COLORS.void, color: COLORS.textMuted }}
      >
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
            style={{ borderColor: COLORS.spotlight, borderTopColor: 'transparent' }}
          />
          Taking your seat…
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans px-6"
        style={{ background: COLORS.void, color: COLORS.textMuted }}
      >
        <div className="text-center max-w-sm">
          <p className="font-serif text-xl mb-2" style={{ color: COLORS.textPrimary }}>
            Room not found
          </p>
          <p className="text-sm mb-6">This room may have ended or the link is incorrect.</p>
          <button
            onClick={onLeave}
            className="px-5 py-2.5 rounded-full font-semibold text-sm"
            style={{ background: COLORS.spotlight, color: COLORS.void }}
          >
            Back to rooms
          </button>
        </div>
      </div>
    );
  }

  const knownUserIds = new Set(wsParticipants);
  const totalCount = Math.max(room.participants?.length || 0, wsParticipants.length || 0, 1);

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: COLORS.void }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: COLORS.border }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{ background: COLORS.liveDim, color: COLORS.live }}
            >
              ● Live
            </span>
            <span
              className="text-[10px] font-mono tracking-widest uppercase"
              style={{ color: COLORS.textMuted }}
            >
              {room.type}
            </span>
            {isHost && (
              <span
                className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{ background: COLORS.spotlightDim, color: COLORS.spotlight }}
              >
                👑 Host
              </span>
            )}
          </div>
          <h2 className="font-serif text-xl truncate" style={{ color: COLORS.textPrimary }}>
            {room.name}
          </h2>
          {room.description && (
            <p className="text-sm mt-0.5 truncate" style={{ color: COLORS.textMuted }}>
              {room.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 rounded-full hover:bg-white/5 transition-colors relative"
          >
            <MessageCircle className="w-5 h-5" style={{ color: COLORS.textMuted }} />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] rounded-full flex items-center justify-center bg-yellow-500 text-black font-bold">
                {chatMessages.length}
              </span>
            )}
          </button>
          <div
            className="flex items-center gap-1.5 text-xs font-mono"
            style={{ color: COLORS.textMuted }}
          >
            <Users className="w-3.5 h-3.5" />
            {totalCount}
          </div>
        </div>
      </div>

      {error && (
        <div
          className="mx-6 mt-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(248, 113, 113, 0.12)', color: '#F87171' }}
        >
          {error}
        </div>
      )}

      {/* Main layout: participants + chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Participants grid */}
        <div
          className={`flex-1 px-6 py-10 transition-all duration-300 ${
            showChat ? 'w-2/3' : 'w-full'
          }`}
          style={{
            backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 0%, ${COLORS.spotlightDim}, transparent 70%)`,
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 max-w-3xl mx-auto">
            {/* You */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {!isMuted && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ border: `2px solid ${COLORS.spotlight}`, opacity: 0.5 }}
                  />
                )}
                <div
                  className="relative w-16 h-16 rounded-full flex items-center justify-center font-serif text-lg font-semibold border-2"
                  style={{
                    background: `hsl(${hueFromString(user?.name || 'You')}, 40%, 22%)`,
                    borderColor: !isMuted ? COLORS.spotlight : COLORS.border,
                    color: COLORS.textPrimary,
                    boxShadow: !isMuted ? `0 0 20px ${COLORS.spotlightDim}` : 'none',
                  }}
                >
                  {initials(user?.name || 'You')}
                </div>
                {isHost && (
                  <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
                )}
              </div>
              <span className="text-sm font-medium mt-2 truncate max-w-full" style={{ color: COLORS.textPrimary }}>
                {user?.name || 'You'} {isHost && '👑'}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {isMuted ? (
                  <MicOff className="w-3 h-3" style={{ color: COLORS.textMuted }} />
                ) : (
                  <Mic className="w-3 h-3" style={{ color: COLORS.live }} />
                )}
                <span className="text-[11px]" style={{ color: COLORS.textMuted }}>
                  you {isMuted ? '· muted' : '· live'}
                </span>
              </div>
            </div>

            {/* Remote LiveKit participants */}
            {livekitParticipants.map((p: any) => {
              const speaking = !!remoteTracks[p.identity];
              const hue = hueFromString(p.name || p.identity);
              const isParticipantHost = room?.creatorId === p.identity;
              return (
                <div key={p.identity} className="flex flex-col items-center group relative">
                  <div className="relative">
                    {speaking && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ border: `2px solid ${COLORS.live}`, opacity: 0.5 }}
                      />
                    )}
                    <div
                      className="relative w-16 h-16 rounded-full flex items-center justify-center font-serif text-lg font-semibold border-2"
                      style={{
                        background: `hsl(${hue}, 40%, 22%)`,
                        borderColor: speaking ? COLORS.live : COLORS.border,
                        color: COLORS.textPrimary,
                        boxShadow: speaking ? `0 0 20px ${COLORS.liveDim}` : 'none',
                      }}
                    >
                      {initials(p.name || p.identity)}
                    </div>
                    {isParticipantHost && (
                      <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <span
                    className="text-sm font-medium mt-2 truncate max-w-full"
                    style={{ color: COLORS.textPrimary }}
                  >
                    {p.name || p.identity}
                  </span>
                  <span className="text-[11px] mt-0.5" style={{ color: COLORS.textMuted }}>
                    {speaking ? '🔊 speaking' : '🔇 quiet'}
                  </span>
                </div>
              );
            })}

            {/* Fallback: participants known only via WebSocket */}
            {wsParticipants
              .filter((uid: string) => uid !== user?.id)
              .map((uid: string) => {
                const participant = room.participants?.find((p: any) => p.userId === uid);
                const name = participant?.user?.name || 'Learner';
                const hue = hueFromString(name);
                return (
                  <div key={uid} className="flex flex-col items-center">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center font-serif text-lg font-semibold border-2"
                      style={{
                        background: `hsl(${hue}, 40%, 22%)`,
                        borderColor: COLORS.border,
                        color: COLORS.textPrimary,
                      }}
                    >
                      {initials(name)}
                    </div>
                    <span
                      className="text-sm font-medium mt-2 truncate max-w-full"
                      style={{ color: COLORS.textPrimary }}
                    >
                      {name}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[11px]" style={{ color: COLORS.textMuted }}>
                        {participant?.role?.toLowerCase() || 'listener'}
                      </span>
                      {participant?.raisedHand && (
                        <Hand className="w-3 h-3" style={{ color: COLORS.spotlight }} />
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Chat sidebar */}
        {showChat && (
          <div
            className="w-1/3 border-l flex flex-col"
            style={{ borderColor: COLORS.border, background: COLORS.surface }}
          >
            <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: COLORS.border }}>
              <span className="font-semibold" style={{ color: COLORS.textPrimary }}>
                Room Chat
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 rounded hover:bg-white/5"
              >
                <X className="w-4 h-4" style={{ color: COLORS.textMuted }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {chatMessages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.userId === user?.id}
                  isHost={isHost}
                  onPin={() => handlePinMessage(msg.id)}
                  onDelete={() => handleDeleteMessage(msg.id)}
                  onKick={() => handleKickUser(msg.userId)}
                  onMute={() => handleMuteUser(msg.userId)}
                />
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t flex gap-2" style={{ borderColor: COLORS.border }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-full text-sm outline-none"
                style={{
                  background: COLORS.void,
                  color: COLORS.textPrimary,
                  border: `1px solid ${COLORS.border}`,
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="p-2 rounded-full disabled:opacity-50"
                style={{ background: COLORS.spotlight, color: COLORS.void }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky control bar */}
      <div
        className="sticky bottom-0 px-6 py-4 border-t flex items-center justify-center gap-3"
        style={{ background: COLORS.surfaceRaised, borderColor: COLORS.border }}
      >
        <button
          onClick={toggleMute}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm border transition-colors"
          style={
            isMuted
              ? { background: 'transparent', borderColor: COLORS.border, color: COLORS.textPrimary }
              : { background: COLORS.liveDim, borderColor: COLORS.live, color: COLORS.live }
          }
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isMuted ? 'Unmute' : 'Mute'}
        </button>

        <button
          onClick={handleRaiseHand}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-transform hover:scale-105"
          style={{ background: COLORS.spotlight, color: COLORS.void }}
        >
          <Hand className="w-4 h-4" />
          Raise Hand
        </button>

        <button
          onClick={handleLeave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-colors"
          style={{ background: 'rgba(248, 113, 113, 0.14)', color: '#F87171' }}
        >
          <PhoneOff className="w-4 h-4" />
          Leave
        </button>
      </div>
    </div>
  );
};