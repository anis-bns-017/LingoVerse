import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  useVoiceRoom, 
  useVoiceSocket, 
  useLiveKitRoom, 
  voiceApi,
  useRoomMessages,
  useSendVoiceMessage,
  useDeleteVoiceMessage,
  useLeaveVoiceRoom,
  type VoiceMessage,
  type VoiceParticipant,
} from '../../hooks/useVoice';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Mic, MicOff, Hand, PhoneOff, Users, 
  MessageCircle, X, Pin, Trash2, 
  UserX, VolumeX, Crown, Send,
  MoreVertical, Loader2, Check,
  Pencil, Reply, Flag, Volume2,
  Mic as MicIcon,
} from 'lucide-react';
import { format } from 'date-fns';

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
const ChatMessageBubble: React.FC<{
  message: VoiceMessage;
  isOwn: boolean;
  isHost: boolean;
  onReply: () => void;
  onPin: () => void;
  onDelete: () => void;
  onKick: () => void;
  onMute: () => void;
}> = ({ message, isOwn, isHost, onReply, onPin, onDelete, onKick, onMute }) => {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (date: string) => {
    return format(new Date(date), 'h:mm a');
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 opacity-50`}>
        <div className="p-3 rounded-xl bg-gray-800/30">
          <p className="text-sm text-gray-400 italic">This message was deleted</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}>
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
              {message.sender?.name || 'Unknown'}
            </span>
            {isHost && (
              <Crown className="w-3 h-3 text-yellow-400" />
            )}
            <span className="text-xs" style={{ color: COLORS.textMuted }}>
              {formatTime(message.createdAt)}
            </span>
          </div>
          <p className="text-sm" style={{ color: COLORS.textPrimary }}>
            {message.content}
          </p>
        </div>

        {/* Action buttons - visible on hover */}
        <div className={`absolute ${isOwn ? '-left-14' : '-right-14'} top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
          <button
            onClick={onReply}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            title="Reply"
          >
            <Reply className="w-3 h-3 text-gray-300" />
          </button>
          {isHost && (
            <button
              onClick={onPin}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
              title={message.isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin className={`w-3 h-3 ${message.isPinned ? 'text-yellow-400' : 'text-gray-300'}`} />
            </button>
          )}
          {isHost && (
            <button
              onClick={onKick}
              className="p-1.5 bg-gray-700 hover:bg-red-600 rounded-full transition-colors"
              title="Kick"
            >
              <UserX className="w-3 h-3 text-gray-300" />
            </button>
          )}
          {isHost && (
            <button
              onClick={onMute}
              className="p-1.5 bg-gray-700 hover:bg-red-600 rounded-full transition-colors"
              title="Mute"
            >
              <VolumeX className="w-3 h-3 text-gray-300" />
            </button>
          )}
          {(isOwn || isHost) && (
            <button
              onClick={onDelete}
              className="p-1.5 bg-gray-700 hover:bg-red-600 rounded-full transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3 text-gray-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Main Component ----------
export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({ roomId, onLeave }) => {
  const { user } = useAuth();
  const { data: room, isLoading, refetch } = useVoiceRoom(roomId);
  const { data: initialMessages } = useRoomMessages(roomId);
  const sendMessageMutation = useSendVoiceMessage();
  const deleteMessageMutation = useDeleteVoiceMessage();
  const leaveRoomMutation = useLeaveVoiceRoom();

  const [token, setToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<VoiceMessage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages from API
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Socket for real-time updates
  const { 
    socket, 
    isConnected, 
    participants: wsParticipants, 
    typingUsers,
    hostId,
    sendChatMessage,
    sendTyping,
    raiseHand,
    kickUser,
    muteUser,
    unmuteUser,
    pinMessage,
    deleteMessage: deleteSocketMessage,
    muteSelf,
  } = useVoiceSocket(roomId, user?.id || '');

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
      } finally {
        setIsJoining(false);
      }
    };
    getToken();
  }, [roomId]);

  // LiveKit room
  const liveKitRoomId = room?.liveKitRoomId || '';
  const {
    isConnected: isLiveKitConnected,
    participants: livekitParticipants,
    remoteTracks,
    toggleMute,
    isMuted,
    error: liveKitError,
  } = useLiveKitRoom(
    liveKitRoomId,
    token,
    {
      onTrackSubscribed: (track) => {
        console.log('Track subscribed:', track);
      },
      onTrackUnsubscribed: (track) => {
        console.log('Track unsubscribed:', track);
      },
      onParticipantConnected: (participant) => {
        console.log('Participant connected:', participant.identity);
      },
      onParticipantDisconnected: (participant) => {
        console.log('Participant disconnected:', participant.identity);
      },
    }
  );

  // ---- Handle incoming socket messages ----
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: VoiceMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId 
            ? { ...m, isDeleted: true, content: 'This message was deleted' } 
            : m
        )
      );
    };

    const handleMessagePinned = (data: { messageId: string; pinned: boolean }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, isPinned: data.pinned } : m
        )
      );
    };

    socket.on('voice:chat', handleNewMessage);
    socket.on('voice:message-deleted', handleMessageDeleted);
    socket.on('voice:message-pinned', handleMessagePinned);

    return () => {
      socket.off('voice:chat', handleNewMessage);
      socket.off('voice:message-deleted', handleMessageDeleted);
      socket.off('voice:message-pinned', handleMessagePinned);
    };
  }, [socket]);

  // ---- Scroll to bottom ----
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---- Handle sending message ----
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const messageData = {
      content: newMessage.trim(),
      type: 'TEXT',
      replyToId: replyTo?.id,
    };

    // Send via WebSocket for real-time
    if (socket && isConnected) {
      sendChatMessage(messageData);
    } else {
      // Fallback to REST API
      sendMessageMutation.mutate({
        roomId,
        content: messageData.content,
        type: messageData.type,
        replyToId: messageData.replyToId,
      });
    }

    setNewMessage('');
    setReplyTo(null);
  }, [newMessage, replyTo, socket, isConnected, sendChatMessage, sendMessageMutation, roomId]);

  // ---- Handle typing ----
  const handleTyping = (isTyping: boolean) => {
    sendTyping(isTyping);
  };

  // ---- Handle raise hand ----
  const handleRaiseHand = () => {
    raiseHand(true);
    toast.success("Hand raised — you're in the queue");
  };

  // ---- Handle leave ----
  const handleLeave = async () => {
    try {
      await leaveRoomMutation.mutateAsync(roomId);
      socket?.emit('voice:leave', { roomId });
      toast.success('Left room');
      onLeave();
    } catch (error) {
      toast.error('Failed to leave room');
    }
  };

  // ---- Host controls ----
  const isHost = hostId === user?.id;

  // ---- Render loading ----
  if (isLoading || isJoining) {
    return (
      <div
        className="min-h-screen flex items-center justify-center font-sans"
        style={{ background: COLORS.void, color: COLORS.textMuted }}
      >
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: COLORS.spotlight }} />
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            {isJoining ? 'Joining room...' : 'Loading room...'}
          </p>
        </div>
      </div>
    );
  }

  // ---- Render room not found ----
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

  const totalParticipants = wsParticipants.length || room.participants?.length || 0;

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: COLORS.void }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: COLORS.border }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{ 
                background: isLiveKitConnected ? COLORS.liveDim : COLORS.border,
                color: isLiveKitConnected ? COLORS.live : COLORS.textMuted 
              }}
            >
              {isLiveKitConnected ? '● Live' : '○ Connecting'}
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
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] rounded-full flex items-center justify-center bg-yellow-500 text-black font-bold">
                {messages.length}
              </span>
            )}
          </button>
          <div
            className="flex items-center gap-1.5 text-xs font-mono"
            style={{ color: COLORS.textMuted }}
          >
            <Users className="w-3.5 h-3.5" />
            {totalParticipants}
          </div>
        </div>
      </div>

      {liveKitError && (
        <div
          className="mx-6 mt-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(248, 113, 113, 0.12)', color: '#F87171' }}
        >
          {liveKitError}
        </div>
      )}

      {/* Main layout: participants + chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Participants grid */}
        <div
          className={`flex-1 px-6 py-10 transition-all duration-300 overflow-y-auto ${
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
                {!isMuted && isLiveKitConnected && (
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
                  {isMuted ? '· muted' : '· live'}
                </span>
              </div>
            </div>

            {/* Remote LiveKit participants */}
            {livekitParticipants.map((p: any) => {
              const hasAudio = !!remoteTracks[p.identity];
              const hue = hueFromString(p.name || p.identity);
              const isParticipantHost = hostId === p.identity;
              return (
                <div key={p.identity} className="flex flex-col items-center group relative">
                  <div className="relative">
                    {hasAudio && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ border: `2px solid ${COLORS.live}`, opacity: 0.5 }}
                      />
                    )}
                    <div
                      className="relative w-16 h-16 rounded-full flex items-center justify-center font-serif text-lg font-semibold border-2"
                      style={{
                        background: `hsl(${hue}, 40%, 22%)`,
                        borderColor: hasAudio ? COLORS.live : COLORS.border,
                        color: COLORS.textPrimary,
                        boxShadow: hasAudio ? `0 0 20px ${COLORS.liveDim}` : 'none',
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
                    {hasAudio ? '🔊 speaking' : '🔇 quiet'}
                  </span>
                </div>
              );
            })}

            {/* Fallback: participants known only via WebSocket */}
            {wsParticipants
              .filter((p: any) => p.userId !== user?.id)
              .map((p: any) => {
                const name = p.user?.name || 'Learner';
                const hue = hueFromString(name);
                const isParticipantHost = hostId === p.userId;
                return (
                  <div key={p.userId} className="flex flex-col items-center">
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
                      {name} {isParticipantHost && '👑'}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[11px]" style={{ color: COLORS.textMuted }}>
                        {p.role?.toLowerCase() || 'listener'}
                      </span>
                      {p.raisedHand && (
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
            <div className="p-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: COLORS.border }}>
              <span className="font-semibold" style={{ color: COLORS.textPrimary }}>
                Room Chat
              </span>
              <div className="flex items-center gap-2">
                {typingUsers.size > 0 && (
                  <span className="text-xs text-indigo-400 animate-pulse">
                    {typingUsers.size} typing...
                  </span>
                )}
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1 rounded hover:bg-white/5"
                >
                  <X className="w-4 h-4" style={{ color: COLORS.textMuted }} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <ChatMessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.senderId === user?.id}
                    isHost={isHost}
                    onReply={() => setReplyTo(msg)}
                    onPin={() => pinMessage(msg.id, !msg.isPinned)}
                    onDelete={() => {
                      if (socket && isConnected) {
                        deleteSocketMessage(msg.id);
                      } else {
                        deleteMessageMutation.mutate({ roomId, messageId: msg.id });
                      }
                    }}
                    onKick={() => kickUser(msg.senderId)}
                    onMute={() => muteUser(msg.senderId)}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-sm" style={{ color: COLORS.textMuted }}>
                    No messages yet
                  </p>
                  <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
                    Start the conversation!
                  </p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {/* Reply indicator */}
            {replyTo && (
              <div className="px-3 py-2 border-t flex items-center justify-between shrink-0" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-2 text-sm">
                  <Reply className="w-4 h-4" style={{ color: COLORS.textMuted }} />
                  <span className="text-xs truncate max-w-[150px]" style={{ color: COLORS.textMuted }}>
                    {replyTo.content}
                  </span>
                </div>
                <button onClick={() => setReplyTo(null)}>
                  <X className="w-4 h-4" style={{ color: COLORS.textMuted }} />
                </button>
              </div>
            )}
            <div className="p-3 border-t flex gap-2 shrink-0" style={{ borderColor: COLORS.border }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping(e.target.value.length > 0);
                }}
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
                className="p-2 rounded-full disabled:opacity-50 transition-opacity"
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
        className="sticky bottom-0 px-6 py-4 border-t flex items-center justify-center gap-3 shrink-0 flex-wrap"
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

        {isHost && (
          <>
            <button
              onClick={() => {
                // Start recording logic here
                voiceApi.startRecording(roomId).then(() => {
                  toast.success('Recording started');
                  refetch();
                }).catch(() => {
                  toast.error('Failed to start recording');
                });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm border transition-colors"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: '#EF4444',
                color: '#EF4444',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Record
            </button>
          </>
        )}

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