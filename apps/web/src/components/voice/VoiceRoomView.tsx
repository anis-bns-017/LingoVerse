import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
} from "../../hooks/useVoice";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Hand,
  PhoneOff,
  Users,
  MessageCircle,
  X,
  Pin,
  Trash2,
  UserX,
  VolumeX,
  Crown,
  Send,
  Reply,
  Loader2,
  AlertCircle,
  UserCog,
} from "lucide-react";
import { format } from "date-fns";

interface VoiceRoomViewProps {
  roomId: string;
  onLeave: () => void;
}

// ---- Shared theater palette ----
const COLORS = {
  void: "#0B0714",
  surface: "#1C1430",
  surfaceRaised: "#251C3E",
  border: "#322754",
  spotlight: "#F5A623",
  spotlightDim: "rgba(245, 166, 35, 0.16)",
  live: "#2DD4BF",
  liveDim: "rgba(45, 212, 191, 0.14)",
  textPrimary: "#F4EFFF",
  textMuted: "#9C90B8",
};

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "?"
  );
}

function hueFromString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
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
  const formatTime = (date: string) => {
    try {
      return format(new Date(date), "h:mm a");
    } catch {
      return "";
    }
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2 opacity-50`}>
        <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
          <p className="text-sm italic" style={{ color: COLORS.textMuted }}>
            This message was deleted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2 group`}>
      <div className="relative max-w-[82%]">
        <div
          className={`relative px-3.5 py-2.5 rounded-2xl transition-shadow ${
            message.isPinned
              ? "border border-yellow-500/40 bg-yellow-500/[0.08] shadow-[0_0_24px_rgba(245,166,35,0.12)]"
              : isOwn
                ? "bg-indigo-500/15 border border-indigo-400/20"
                : "bg-white/[0.04] border border-white/[0.06]"
          } ${isOwn ? "rounded-br-md" : "rounded-bl-md"}`}
        >
          {message.isPinned && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-yellow-400 mb-1">
              <Pin className="w-3 h-3" /> Pinned
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[13px] font-semibold tracking-tight"
              style={{ color: COLORS.textPrimary }}
            >
              {message.sender?.name || "Unknown"}
            </span>
            {isHost && <Crown className="w-3 h-3 text-yellow-400" />}
            <span className="text-[10px] font-mono" style={{ color: COLORS.textMuted }}>
              {formatTime(message.createdAt)}
            </span>
          </div>
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap break-words"
            style={{ color: COLORS.textPrimary }}
          >
            {message.content}
          </p>
        </div>

        {/* Action buttons - visible on hover */}
        <div
          className={`absolute ${isOwn ? "-left-14" : "-right-14"} top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
        >
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
              title={message.isPinned ? "Unpin" : "Pin"}
            >
              <Pin
                className={`w-3 h-3 ${message.isPinned ? "text-yellow-400" : "text-gray-300"}`}
              />
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
export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({
  roomId,
  onLeave,
}) => {
  const { user } = useAuth();

  // Data queries
  const { data: room, isLoading, refetch } = useVoiceRoom(roomId);
  const { data: initialMessages, refetch: refetchMessages } =
    useRoomMessages(roomId);
  const sendMessageMutation = useSendVoiceMessage();
  const deleteMessageMutation = useDeleteVoiceMessage();
  const leaveRoomMutation = useLeaveVoiceRoom();

  // Local state
  const [token, setToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<VoiceMessage | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showHostMenu, setShowHostMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // WebSocket hook
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
    promoteHost,
    fetchMessages,
  } = useVoiceSocket(roomId, user?.id || "");

  // LiveKit hook
  const liveKitRoomId = room?.liveKitRoomId || "";
  const liveKitResult = useLiveKitRoom(liveKitRoomId, token, {
    onTrackSubscribed: (track) => {
      console.log("Track subscribed:", track);
    },
    onTrackUnsubscribed: (track) => {
      console.log("Track unsubscribed:", track);
    },
  });

  const {
    isConnected: isLiveKitConnected,
    participants: livekitParticipants = [],
    remoteTracks = {},
    toggleMute,
    error: liveKitError,
    room: lkRoom,
    isMockMode,
  } = liveKitResult;

  // 1. ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURN (Rules of Hooks)
  const allParticipants = useMemo(() => {
    const wsMap = new Map();
    (wsParticipants || []).forEach((p: any) => {
      wsMap.set(p.userId, { ...p, source: "ws" });
    });
    (room?.participants || []).forEach((p: any) => {
      if (!wsMap.has(p.userId)) {
        wsMap.set(p.userId, { ...p, source: "db" });
      }
    });
    return Array.from(wsMap.values());
  }, [wsParticipants, room?.participants]);

  // Load initial messages from React Query cache
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      setLastReadMessageId(
        initialMessages[initialMessages.length - 1]?.id || null,
      );
    }
  }, [initialMessages]);

  // Refetch messages when socket connects
  useEffect(() => {
    if (socket && isConnected) {
      refetchMessages();
    }
  }, [socket, isConnected, refetchMessages]);

  // Join room & fetch LiveKit token
  useEffect(() => {
    const getToken = async () => {
      if (!roomId) return;
      try {
        setIsJoining(true);
        const res = await voiceApi.joinRoom(roomId);
        setToken(res.data.token);
        if (res.data.token?.startsWith("mock-")) {
          console.log("🔇 Running in mock LiveKit mode");
          toast.info("Running in voice demo mode (audio/video disabled)");
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to join room");
      } finally {
        setIsJoining(false);
      }
    };
    getToken();
  }, [roomId]);

  // Handle incoming socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: VoiceMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        if (!showChat && message.senderId !== user?.id) {
          setUnreadCount((prevCount) => prevCount + 1);
        }
        return [...prev, message];
      });
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, isDeleted: true, content: "This message was deleted" }
            : m,
        ),
      );
    };

    const handleMessagePinned = (data: { messageId: string; pinned: boolean }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, isPinned: data.pinned } : m,
        ),
      );
    };

    const handleMessageHistory = (history: VoiceMessage[]) => {
      setMessages(history);
      setUnreadCount(0);
      if (history.length > 0) {
        setLastReadMessageId(history[history.length - 1]?.id || null);
      }
    };

    socket.on("voice:chat", handleNewMessage);
    socket.on("voice:message-deleted", handleMessageDeleted);
    socket.on("voice:message-pinned", handleMessagePinned);
    socket.on("voice:message-history", handleMessageHistory);

    return () => {
      socket.off("voice:chat", handleNewMessage);
      socket.off("voice:message-deleted", handleMessageDeleted);
      socket.off("voice:message-pinned", handleMessagePinned);
      socket.off("voice:message-history", handleMessageHistory);
    };
  }, [socket, showChat, user?.id]);

  const handleToggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      setUnreadCount(0);
      if (messages.length > 0) {
        setLastReadMessageId(messages[messages.length - 1]?.id || null);
      }
    }
  };

  // Scroll chat to bottom — uses container scrollTo so it doesn't affect page
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const messageData = {
      content: newMessage.trim(),
      type: "TEXT",
      replyToId: replyTo?.id,
    };

    if (socket && isConnected) {
      sendChatMessage(messageData);
    } else {
      sendMessageMutation.mutate({
        roomId,
        content: messageData.content,
        type: messageData.type,
        replyToId: messageData.replyToId,
      });
    }

    setNewMessage("");
    setReplyTo(null);
  }, [
    newMessage,
    replyTo,
    socket,
    isConnected,
    sendChatMessage,
    sendMessageMutation,
    roomId,
  ]);

  const handleTyping = (isTyping: boolean) => {
    sendTyping(isTyping);
  };

  const handleRaiseHand = () => {
    raiseHand(true);
    toast.success("Hand raised — you're in the queue");
  };

  const handlePromoteHost = (userIdToPromote: string) => {
    promoteHost(userIdToPromote);
    setShowHostMenu(false);
    const userName = getUserName(userIdToPromote);
    toast.success(`👑 ${userName} is now the host!`);
  };

  const getUserName = (userId: string) => {
    const participant = wsParticipants.find((p: any) => p.userId === userId);
    return participant?.user?.name || "User";
  };

  const handleLeave = async () => {
    try {
      await leaveRoomMutation.mutateAsync(roomId);
      socket?.emit("voice:leave", { roomId });
      toast.success("Left room");
      onLeave();
    } catch (error) {
      toast.error("Failed to leave room");
    }
  };

  const isHost = hostId === user?.id || room?.creatorId === user?.id;

  // 2. EARLY RETURNS PLACED SAFELY AFTER ALL HOOKS
  if (isLoading || isJoining) {
    return (
      <div
        className="h-screen flex items-center justify-center font-sans overflow-hidden"
        style={{ background: COLORS.void, color: COLORS.textMuted }}
      >
        <div className="text-center">
          <Loader2
            className="w-10 h-10 animate-spin mx-auto mb-3"
            style={{ color: COLORS.spotlight }}
          />
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            {isJoining ? "Joining voice room..." : "Loading room parameters..."}
          </p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div
        className="h-screen flex items-center justify-center font-sans px-6 overflow-hidden"
        style={{ background: COLORS.void, color: COLORS.textMuted }}
      >
        <div className="text-center max-w-sm">
          <p
            className="font-serif text-xl mb-2"
            style={{ color: COLORS.textPrimary }}
          >
            Room not found
          </p>
          <p className="text-sm mb-6">
            This room may have ended or the link is incorrect.
          </p>
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

  const totalParticipants = Math.max(
    allParticipants.length,
    livekitParticipants?.length || 1,
  );

  return (
    // 🔒 Root: locked to viewport. NO page scroll possible.
    <div
      className="h-screen font-sans flex flex-col overflow-hidden"
      style={{ background: COLORS.void }}
    >
      {/* Top bar — fixed height, never shrinks */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: COLORS.border }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{
                background: isLiveKitConnected ? COLORS.liveDim : COLORS.border,
                color: isLiveKitConnected ? COLORS.live : COLORS.textMuted,
              }}
            >
              {isLiveKitConnected
                ? "● Live"
                : token?.startsWith("mock-")
                  ? "🔇 Demo"
                  : "○ Connecting"}
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
                style={{
                  background: COLORS.spotlightDim,
                  color: COLORS.spotlight,
                }}
              >
                👑 Host
              </span>
            )}
            {isMockMode && (
              <span
                className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(251, 191, 36, 0.15)",
                  color: "#FBBF24",
                }}
              >
                🎭 Demo Mode
              </span>
            )}
          </div>
          <h2
            className="font-serif text-xl truncate"
            style={{ color: COLORS.textPrimary }}
          >
            {room.name}
          </h2>
          {room.description && (
            <p
              className="text-sm mt-0.5 truncate"
              style={{ color: COLORS.textMuted }}
            >
              {room.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <button
            onClick={handleToggleChat}
            className="p-2 rounded-full hover:bg-white/5 transition-colors relative"
            title={showChat ? "Hide chat" : "Show chat"}
          >
            <MessageCircle
              className="w-5 h-5"
              style={{ color: showChat ? COLORS.spotlight : COLORS.textMuted }}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 text-[10px] rounded-full flex items-center justify-center px-1.5 bg-red-500 text-white font-bold animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <div
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-full border"
            style={{ color: COLORS.textMuted, borderColor: COLORS.border }}
          >
            <Users className="w-3.5 h-3.5" />
            {totalParticipants}
          </div>
        </div>
      </header>

      {/* Connection errors / notices — fixed height, never shrinks */}
      {(liveKitError || isMockMode) && (
        <div className="px-6 pt-3 shrink-0 space-y-2">
          {liveKitError && !isMockMode && (
            <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>LiveKit Error: {liveKitError}</span>
            </div>
          )}
          {isMockMode && (
            <div className="px-4 py-3 rounded-xl text-sm flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                🎭 Demo Mode: Chat & WebSocket work, but audio/video is disabled
                (LiveKit not running).
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main layout: participants + chat.
          flex-1 + min-h-0 → allows inner overflow to be contained. */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Participants grid */}
        <section
          className={`flex-1 min-w-0 px-6 py-8 transition-all duration-300 overflow-y-auto overscroll-contain ${
            showChat ? "md:w-2/3" : "w-full"
          }`}
          style={{
            backgroundImage: `radial-gradient(ellipse 70% 50% at 50% 0%, ${COLORS.spotlightDim}, transparent 70%)`,
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {/* Current user */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {!isMuted && isLiveKitConnected && !isMockMode && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      border: `2px solid ${COLORS.spotlight}`,
                      opacity: 0.5,
                    }}
                  />
                )}
                <div
                  className="relative w-16 h-16 rounded-full flex items-center justify-center font-serif text-lg font-semibold border-2 transition-all"
                  style={{
                    background: `hsl(${hueFromString(user?.name || "You")}, 40%, 22%)`,
                    borderColor: !isMuted ? COLORS.spotlight : COLORS.border,
                    color: COLORS.textPrimary,
                    boxShadow:
                      !isMuted && !isMockMode
                        ? `0 0 20px ${COLORS.spotlightDim}`
                        : "none",
                  }}
                >
                  {initials(user?.name || "You")}
                </div>
                {isHost && (
                  <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
                )}
              </div>
              <span
                className="text-sm font-medium mt-2 truncate max-w-full"
                style={{ color: COLORS.textPrimary }}
              >
                {user?.name || "You"} {isHost && "👑"}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {isMuted ? (
                  <MicOff className="w-3 h-3" style={{ color: COLORS.textMuted }} />
                ) : (
                  <Mic className="w-3 h-3" style={{ color: COLORS.live }} />
                )}
                <span
                  className="text-[11px]"
                  style={{ color: COLORS.textMuted }}
                >
                  {isMockMode ? "· demo" : isMuted ? "· muted" : "· live"}
                </span>
              </div>
            </div>

            {/* Remote LiveKit participants */}
            {!isMockMode &&
              Array.isArray(livekitParticipants) &&
              livekitParticipants.map((p: any) => {
                const hasAudio = remoteTracks?.[p.identity] || false;
                const hue = hueFromString(p.name || p.identity);
                const isParticipantHost = hostId === p.identity;
                return (
                  <div
                    key={p.identity}
                    className="flex flex-col items-center group relative"
                  >
                    <div className="relative">
                      {hasAudio && (
                        <span
                          className="absolute inset-0 rounded-full animate-ping"
                          style={{
                            border: `2px solid ${COLORS.live}`,
                            opacity: 0.5,
                          }}
                        />
                      )}
                      <div
                        className="relative w-16 h-16 rounded-full flex items-center justify-center font-serif text-lg font-semibold border-2 transition-all"
                        style={{
                          background: `hsl(${hue}, 40%, 22%)`,
                          borderColor: hasAudio ? COLORS.live : COLORS.border,
                          color: COLORS.textPrimary,
                          boxShadow: hasAudio
                            ? `0 0 20px ${COLORS.liveDim}`
                            : "none",
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
                    <span
                      className="text-[11px] mt-0.5"
                      style={{ color: COLORS.textMuted }}
                    >
                      {hasAudio ? "🔊 speaking" : "🔇 quiet"}
                    </span>
                  </div>
                );
              })}

            {/* Fallback WS Participants */}
            {Array.isArray(wsParticipants) &&
              wsParticipants
                .filter(
                  (p: any) =>
                    p.userId !== user?.id &&
                    !(
                      Array.isArray(livekitParticipants) &&
                      livekitParticipants.some(
                        (lp: any) => lp.identity === p.userId,
                      )
                    ),
                )
                .map((p: any) => {
                  const name = p.user?.name || "Learner";
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
                        {name} {isParticipantHost && "👑"}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className="text-[11px]"
                          style={{ color: COLORS.textMuted }}
                        >
                          {p.role?.toLowerCase() || "listener"}
                        </span>
                        {p.raisedHand && (
                          <Hand
                            className="w-3 h-3"
                            style={{ color: COLORS.spotlight }}
                          />
                        )}
                      </div>
                      {isHost && p.userId !== user?.id && (
                        <button
                          onClick={() => handlePromoteHost(p.userId)}
                          className="mt-2 text-xs px-3 py-1 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors flex items-center gap-1"
                          title="Make this user the host"
                        >
                          <UserCog className="w-3 h-3" />
                          Make Host
                        </button>
                      )}
                    </div>
                  );
                })}
          </div>
        </section>

        {/* Chat sidebar */}
        {showChat && (
          <aside
            className="w-full md:w-[380px] md:w-1/3 border-l flex flex-col min-h-0 shrink-0"
            style={{ borderColor: COLORS.border, background: COLORS.surface }}
          >
            {/* Chat header */}
            <div
              className="px-4 py-3 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: COLORS.border }}
            >
              <div className="flex items-center gap-2">
                <MessageCircle
                  className="w-4 h-4"
                  style={{ color: COLORS.spotlight }}
                />
                <span
                  className="font-semibold text-sm"
                  style={{ color: COLORS.textPrimary }}
                >
                  Room Chat
                </span>
              </div>
              <div className="flex items-center gap-2">
                {typingUsers.size > 0 && (
                  <span className="text-xs text-indigo-400 animate-pulse">
                    {typingUsers.size} typing...
                  </span>
                )}
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                  title="Close chat"
                >
                  <X className="w-4 h-4" style={{ color: COLORS.textMuted }} />
                </button>
              </div>
            </div>

            {/* 🔑 Chat scroll area:
                 - flex-1 + min-h-0 → lets it shrink inside the flex column
                 - overflow-y-auto → only this element scrolls
                 - overscroll-contain → prevents scroll chaining to the page
            */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: `${COLORS.border} transparent`,
              }}
            >
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
                        deleteMessageMutation.mutate({
                          roomId,
                          messageId: msg.id,
                        });
                      }
                    }}
                    onKick={() => kickUser(msg.senderId)}
                    onMute={() => muteUser(msg.senderId)}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ background: COLORS.spotlightDim }}
                  >
                    <MessageCircle
                      className="w-5 h-5"
                      style={{ color: COLORS.spotlight }}
                    />
                  </div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: COLORS.textPrimary }}
                  >
                    No messages yet
                  </p>
                  <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
                    Start the conversation!
                  </p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Reply bar */}
            {replyTo && (
              <div
                className="px-3 py-2 border-t flex items-center justify-between shrink-0"
                style={{
                  borderColor: COLORS.border,
                  background: COLORS.surfaceRaised,
                }}
              >
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <Reply className="w-4 h-4 shrink-0" style={{ color: COLORS.spotlight }} />
                  <div className="min-w-0">
                    <div
                      className="text-[10px] font-mono uppercase tracking-wider"
                      style={{ color: COLORS.textMuted }}
                    >
                      Replying to
                    </div>
                    <span
                      className="text-xs truncate block max-w-[200px]"
                      style={{ color: COLORS.textPrimary }}
                    >
                      {replyTo.content}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" style={{ color: COLORS.textMuted }} />
                </button>
              </div>
            )}

            {/* Input bar */}
            <div
              className="p-3 border-t flex gap-2 shrink-0"
              style={{ borderColor: COLORS.border }}
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping(e.target.value.length > 0);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 min-w-0 px-4 py-2.5 rounded-full text-sm outline-none transition-colors focus:border-[var(--spotlight)]"
                style={{
                  background: COLORS.void,
                  color: COLORS.textPrimary,
                  border: `1px solid ${COLORS.border}`,
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="p-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shrink-0"
                style={{ background: COLORS.spotlight, color: COLORS.void }}
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}
      </main>

      {/* Sticky control bar — fixed height, never shrinks */}
      <footer
        className="px-6 py-4 border-t flex items-center justify-center gap-3 shrink-0 flex-wrap"
        style={{ background: COLORS.surfaceRaised, borderColor: COLORS.border }}
      >
        <button
          onClick={toggleMute}
          disabled={isMockMode}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm border transition-all hover:scale-105 active:scale-95 ${
            isMockMode ? "opacity-50 cursor-not-allowed" : ""
          }`}
          style={
            isMuted || isMockMode
              ? {
                  background: "transparent",
                  borderColor: COLORS.border,
                  color: COLORS.textMuted,
                }
              : {
                  background: COLORS.liveDim,
                  borderColor: COLORS.live,
                  color: COLORS.live,
                }
          }
        >
          {isMuted || isMockMode ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          {isMockMode ? "Demo" : isMuted ? "Unmute" : "Mute"}
        </button>

        <button
          onClick={handleRaiseHand}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95"
          style={{ background: COLORS.spotlight, color: COLORS.void }}
        >
          <Hand className="w-4 h-4" />
          Raise Hand
        </button>

        {isHost && !isMockMode && (
          <button
            onClick={() => {
              voiceApi
                .startRecording(roomId)
                .then(() => {
                  toast.success("Recording started");
                  refetch();
                })
                .catch(() => {
                  toast.error("Failed to start recording");
                });
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm border transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              borderColor: "#EF4444",
              color: "#EF4444",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Record
          </button>
        )}

        <button
          onClick={handleLeave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95"
          style={{ background: "rgba(248, 113, 113, 0.14)", color: "#F87171" }}
        >
          <PhoneOff className="w-4 h-4" />
          Leave
        </button>
      </footer>
    </div>
  );
};