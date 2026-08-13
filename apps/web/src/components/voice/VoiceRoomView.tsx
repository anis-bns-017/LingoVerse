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
  MoreVertical,
  Volume2,
  Volume1,
  Volume,
  VolumeOff,
  Check,
  CheckCheck,
  Clock,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Gift,
  Heart,
  ThumbsUp,
  Sparkles,
  Zap,
  Flame,
  Star,
  Share2,
  Link2,
  Copy,
  Settings,
  UserPlus,
  UserMinus,
  Shield,
  Flag,
  Ban,
  Mic as MicIcon,
  Headphones,
  Music,
  Coffee,
  Gamepad2,
  BookOpen,
  Globe,
  Calendar,
  Award,
  Trophy,
  Medal,
  HeartHandshake,
  Handshake,
  Stars,
  Waves,
  Radio,
  Compass,
  MapPin,
  Compass as CompassIcon,
  Mountain,
  Sun,
  Moon,
  Cloud,
  Wind,
  Droplets,
  Sparkle,
  Zap as ZapIcon,
  Flame as FlameIcon,
  Gem,
  Diamond,
  Leaf,
  Feather,
  Anchor,
  Infinity,
  Target,
  Compass as Direction,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { format } from "date-fns";

interface VoiceRoomViewProps {
  roomId: string;
  onLeave: () => void;
}

// ---- Premium Theme ----
const THEME = {
  // Cosmic Dark
  void: "#0A0A12",
  surface: "#141425",
  surfaceRaised: "#1E1E38",
  surfaceHover: "#2A2A4A",
  border: "#2A2A4A",
  borderGlow: "rgba(120, 80, 255, 0.2)",

  // Aurora Accents
  aurora: {
    primary: "#7C6AFF",
    secondary: "#A78BFA",
    tertiary: "#6EE7B7",
    quaternary: "#FCD34D",
    pink: "#F472B6",
    cyan: "#67E8F9",
  },

  // Gradients
  gradient: {
    from: "rgba(124, 106, 255, 0.15)",
    to: "rgba(167, 139, 250, 0.05)",
  },

  text: {
    primary: "#F8F7FF",
    secondary: "#B8B0D8",
    muted: "#7A72A0",
    accent: "#A78BFA",
  },

  status: {
    live: "#6EE7B7",
    liveGlow: "rgba(110, 231, 183, 0.3)",
    muted: "#7A72A0",
    speaking: "#A78BFA",
    speakingGlow: "rgba(167, 139, 250, 0.4)",
  },
};

// ---- Immersive Background Particles ----
const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: {
      x: number;
      y: number;
      radius: number;
      speed: number;
      angle: number;
      opacity: number;
    }[] = [];
    const count = 80;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.1,
        angle: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.angle += 0.01;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(167, 139, 250, ${0.05 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

// ---- Floating Energy Orbs ----
const EnergyOrbs: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const orbs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      size: 100 + Math.random() * 200,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 5,
      opacity: 0.02 + Math.random() * 0.03,
    }));
  }, [count]);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: `radial-gradient(circle, ${THEME.aurora.primary}, transparent)`,
            opacity: orb.opacity,
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -20, 30, -10, 0],
            scale: [1, 1.1, 0.9, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// ---- Glowing Avatar ----
const GlowingAvatar: React.FC<{
  name: string;
  isActive?: boolean;
  isHost?: boolean;
  isSpeaking?: boolean;
  size?: number;
  glowColor?: string;
}> = ({
  name,
  isActive = false,
  isHost = false,
  isSpeaking = false,
  size = 64,
  glowColor = THEME.aurora.primary,
}) => {
  const hue = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  }, [name]);

  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        className="relative"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", damping: 20 }}
      >
        {/* Glow Ring */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              background: `radial-gradient(circle, ${glowColor}44, transparent 70%)`,
              filter: "blur(8px)",
            }}
          />
        )}

        {/* Speaking Pulse Ring */}
        {isSpeaking && (
          <motion.div
            className="absolute inset-[-4px] rounded-full border-2"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ borderColor: THEME.status.speaking }}
          />
        )}

        {/* Avatar Circle */}
        <motion.div
          className="relative rounded-full flex items-center justify-center font-serif text-lg font-bold border-2 shadow-lg"
          style={{
            width: size,
            height: size,
            background: `hsl(${hue}, 50%, 25%)`,
            borderColor: isActive ? glowColor : THEME.border,
            color: THEME.text.primary,
            boxShadow: isActive ? `0 0 40px ${glowColor}33` : "none",
          }}
        >
          {name
            .split(" ")
            .slice(0, 2)
            .map((n) => n[0]?.toUpperCase())
            .join("") || "?"}

          {/* Live Dot */}
          {isActive && (
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                background: THEME.status.live,
                borderColor: THEME.surface,
                boxShadow: `0 0 12px ${THEME.status.liveGlow}`,
              }}
            />
          )}
        </motion.div>

        {/* Crown for Host */}
        {isHost && (
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Crown className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
          </motion.div>
        )}
      </motion.div>

      {/* Name */}
      <span
        className="text-sm font-medium mt-2 truncate max-w-[80px]"
        style={{ color: THEME.text.primary }}
      >
        {name}
      </span>

      {/* Status */}
      {isActive && (
        <span
          className="text-[10px] flex items-center gap-1"
          style={{ color: THEME.text.muted }}
        >
          {isSpeaking ? (
            <>
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                🔊
              </motion.span>
              speaking
            </>
          ) : (
            "listening"
          )}
        </span>
      )}
    </div>
  );
};

// ---- Chat Message with Glass Effect ----
const GlassMessage: React.FC<{
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

  if (message.isDeleted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}
      >
        <div className="px-3 py-2 rounded-xl backdrop-blur-sm border border-white/5">
          <p className="text-sm italic" style={{ color: THEME.text.muted }}>
            This message was deleted
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative max-w-[80%]">
        <motion.div
          className={`relative px-4 py-3 rounded-2xl backdrop-blur-sm border transition-all ${
            message.isPinned
              ? "border-amber-500/30 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
              : isOwn
                ? "border-purple-500/30 bg-purple-500/10"
                : "border-white/5 bg-white/5"
          } ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"}`}
          whileHover={{ scale: 1.01 }}
        >
          {/* Pinned Badge */}
          {message.isPinned && (
            <div className="flex items-center gap-1 text-xs font-medium text-amber-400 mb-1">
              <Pin className="w-3 h-3" /> Pinned
            </div>
          )}

          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-sm font-semibold"
              style={{ color: THEME.text.primary }}
            >
              {message.sender?.name || "Unknown"}
            </span>
            {isHost && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
            <span className="text-[10px]" style={{ color: THEME.text.muted }}>
              {formatTime(message.createdAt)}
            </span>
          </div>

          {/* Content */}
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: THEME.text.primary }}
          >
            {message.content}
          </p>

          {/* Reply Indicator */}
          {message.replyTo && (
            <div
              className="mt-2 pt-2 border-t text-xs flex items-center gap-1.5"
              style={{ borderColor: THEME.border, color: THEME.text.muted }}
            >
              <Reply className="w-3 h-3" />
              <span>Replying to {message.replyTo.sender?.name}</span>
            </div>
          )}
        </motion.div>

        {/* Action Buttons - Floating Glass Panel */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              className={`absolute ${isOwn ? "-left-14" : "-right-14"} top-0 flex flex-col gap-1`}
            >
              <div
                className="flex flex-col gap-1 p-1.5 rounded-xl backdrop-blur-xl border border-white/10"
                style={{ background: "rgba(20, 20, 37, 0.9)" }}
              >
                <button
                  onClick={onReply}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                  title="Reply"
                  style={{ color: THEME.text.secondary }}
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
                {isHost && (
                  <>
                    <button
                      onClick={onPin}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                      title={message.isPinned ? "Unpin" : "Pin"}
                      style={{
                        color: message.isPinned
                          ? "#FCD34D"
                          : THEME.text.secondary,
                      }}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={onKick}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all"
                      title="Kick"
                      style={{ color: THEME.text.secondary }}
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={onMute}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all"
                      title="Mute"
                      style={{ color: THEME.text.secondary }}
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                {(isOwn || isHost) && (
                  <button
                    onClick={onDelete}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all"
                    title="Delete"
                    style={{ color: THEME.text.secondary }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ---- Main Component ----
export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({
  roomId,
  onLeave,
}) => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<VoiceMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isRaisingHand, setIsRaisingHand] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showParticipantDetails, setShowParticipantDetails] = useState<
    string | null
  >(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Data queries
  const { data: room, isLoading, refetch } = useVoiceRoom(roomId);
  const { data: initialMessages, refetch: refetchMessages } =
    useRoomMessages(roomId);
  const sendMessageMutation = useSendVoiceMessage();
  const deleteMessageMutation = useDeleteVoiceMessage();
  const leaveRoomMutation = useLeaveVoiceRoom();

  // WebSocket hook
  const {
    socket,
    isConnected,
    participants: wsParticipants,
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
  } = useVoiceSocket(roomId, user?.id || "");

  // LiveKit hook
  const liveKitRoomId = room?.liveKitRoomId || "";
  const liveKitResult = useLiveKitRoom(liveKitRoomId, token, {
    onTrackSubscribed: () => {},
    onTrackUnsubscribed: () => {},
    onAudioLevel: (level) => setAudioLevel(level),
  });

  const {
    isConnected: isLiveKitConnected,
    participants: livekitParticipants = [],
    remoteTracks = {},
    toggleMute,
    error: liveKitError,
    isMockMode,
  } = liveKitResult;

  // All participants
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

  // Load messages
  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  // Join room
  useEffect(() => {
    const getToken = async () => {
      if (!roomId) return;
      try {
        setIsJoining(true);
        const res = await voiceApi.joinRoom(roomId);
        setToken(res.data.token);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to join room");
      } finally {
        setIsJoining(false);
      }
    };
    getToken();
  }, [roomId]);

  // Socket handlers
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: VoiceMessage) => {
      setMessages((prev) => [...prev, message]);
      if (!showChat && message.senderId !== user?.id) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, isDeleted: true } : m,
        ),
      );
    };

    const handleMessagePinned = (data: {
      messageId: string;
      pinned: boolean;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, isPinned: data.pinned } : m,
        ),
      );
    };

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    };

    socket.on("voice:chat", handleNewMessage);
    socket.on("voice:message-deleted", handleMessageDeleted);
    socket.on("voice:message-pinned", handleMessagePinned);
    socket.on("voice:typing", handleTyping);

    return () => {
      socket.off("voice:chat", handleNewMessage);
      socket.off("voice:message-deleted", handleMessageDeleted);
      socket.off("voice:message-pinned", handleMessagePinned);
      socket.off("voice:typing", handleTyping);
    };
  }, [socket, showChat, user?.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
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
      sendMessageMutation.mutate({ roomId, ...messageData });
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

  const handleRaiseHand = () => {
    setIsRaisingHand(true);
    raiseHand(true);
    toast.success("✋ Hand raised! You're in the queue.");
    setTimeout(() => setIsRaisingHand(false), 3000);
  };

  const handleLeave = async () => {
    if (window.confirm("Are you sure you want to leave?")) {
      try {
        await leaveRoomMutation.mutateAsync(roomId);
        socket?.emit("voice:leave", { roomId });
        toast.success("Left room");
        onLeave();
      } catch (error) {
        toast.error("Failed to leave room");
      }
    }
  };

  const isHost = hostId === user?.id || room?.creatorId === user?.id;

  // Loading
  if (isLoading || isJoining) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: THEME.void, color: THEME.text.muted }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Loader2
              className="w-12 h-12 mx-auto mb-4"
              style={{ color: THEME.aurora.primary }}
            />
          </motion.div>
          <p className="text-sm" style={{ color: THEME.text.secondary }}>
            {isJoining ? "🎧 Joining the conversation..." : "Loading room..."}
          </p>
        </motion.div>
      </div>
    );
  }

  if (!room) {
    return (
      <div
        className="h-screen flex items-center justify-center px-6"
        style={{ background: THEME.void, color: THEME.text.muted }}
      >
        <div className="text-center max-w-sm">
          <AlertCircle
            className="w-12 h-12 mx-auto mb-4 opacity-50"
            style={{ color: THEME.text.muted }}
          />
          <h2
            className="text-2xl font-serif mb-2"
            style={{ color: THEME.text.primary }}
          >
            Room Not Found
          </h2>
          <p className="text-sm mb-6">
            This room may have ended or the link is incorrect.
          </p>
          <button
            onClick={onLeave}
            className="px-6 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105"
            style={{ background: THEME.aurora.primary, color: "#fff" }}
          >
            Back to Rooms
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
    <div
      className="h-screen flex flex-col overflow-hidden relative"
      style={{ background: THEME.void }}
    >
      {/* Background Effects */}
      <ParticleBackground />
      <EnergyOrbs count={4} />

      {/* Top Bar - Glass Effect */}
      <header
        className="relative z-10 flex items-center justify-between px-6 py-4 border-b shrink-0 backdrop-blur-xl"
        style={{
          background: "rgba(20, 20, 37, 0.8)",
          borderColor: THEME.border,
        }}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Room Icon */}
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
            }}
          >
            <Radio className="w-5 h-5 text-white" />
          </motion.div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span
                className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1.5"
                style={{
                  background: isLiveKitConnected
                    ? "rgba(110, 231, 183, 0.15)"
                    : THEME.border,
                  color: isLiveKitConnected
                    ? THEME.status.live
                    : THEME.text.muted,
                }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isLiveKitConnected ? "animate-pulse" : ""}`}
                  style={{
                    background: isLiveKitConnected
                      ? THEME.status.live
                      : THEME.text.muted,
                  }}
                />
                {isLiveKitConnected
                  ? "Live"
                  : isMockMode
                    ? "Demo"
                    : "Connecting"}
              </span>
              <span
                className="text-[10px] font-mono tracking-wider"
                style={{ color: THEME.text.muted }}
              >
                · {room.type}
              </span>
              {isHost && (
                <span
                  className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#FBBF24",
                  }}
                >
                  <Crown className="w-3 h-3" /> Host
                </span>
              )}
            </div>
            <h2
              className="text-xl font-serif truncate"
              style={{ color: THEME.text.primary }}
            >
              {room.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Participants Count with Pulse */}
          <div
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border"
            style={{ color: THEME.text.secondary, borderColor: THEME.border }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Users
                className="w-3.5 h-3.5"
                style={{ color: THEME.aurora.primary }}
              />
            </motion.div>
            {totalParticipants}
          </div>

          {/* Chat Toggle with Notification Badge */}
          <button
            onClick={() => {
              setShowChat(!showChat);
              if (showChat) setUnreadCount(0);
            }}
            className="relative p-2 rounded-full hover:bg-white/5 transition-colors"
            style={{
              color: showChat ? THEME.aurora.primary : THEME.text.muted,
            }}
          >
            <MessageCircle className="w-5 h-5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 text-[10px] rounded-full flex items-center justify-center px-1.5 font-bold"
                style={{ background: "#EF4444", color: "#fff" }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </button>

          {/* Share Button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/voice/${roomId}`,
              );
              toast.success("📋 Room link copied!");
            }}
            className="p-2 rounded-full hover:bg-white/5 transition-colors hidden sm:inline-flex"
            style={{ color: THEME.text.muted }}
          >
            <Link2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex flex-1 min-h-0 relative z-10">
        {/* Participants Grid - Cosmic Layout */}
        <section
          className={`flex-1 min-w-0 px-6 py-8 transition-all duration-300 overflow-y-auto ${
            showChat ? "md:w-2/3" : "w-full"
          }`}
          style={{
            backgroundImage: `radial-gradient(ellipse 60% 40% at 50% 20%, ${THEME.gradient.from}, transparent 70%)`,
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {/* Current User */}
            <GlowingAvatar
              name={user?.name || "You"}
              isActive={!isMuted && isLiveKitConnected}
              isHost={isHost}
              isSpeaking={audioLevel > 0.1}
              glowColor={THEME.aurora.primary}
              size={72}
            />

            {/* Remote Participants */}
            {!isMockMode &&
              livekitParticipants?.map((p: any) => {
                const hasAudio = remoteTracks?.[p.identity] || false;
                const isParticipantHost = hostId === p.identity;
                const isSpeaking = false; // Would need audio level from LiveKit

                return (
                  <GlowingAvatar
                    key={p.identity}
                    name={p.name || p.identity}
                    isActive={hasAudio}
                    isHost={isParticipantHost}
                    isSpeaking={hasAudio}
                    glowColor={THEME.aurora.secondary}
                    size={72}
                  />
                );
              })}

            {/* WS Participants (fallback) */}
            {wsParticipants
              ?.filter((p: any) => p.userId !== user?.id)
              .map((p: any) => {
                const name = p.user?.name || "Learner";
                const isParticipantHost = hostId === p.userId;

                return (
                  <GlowingAvatar
                    key={p.userId}
                    name={name}
                    isActive={false}
                    isHost={isParticipantHost}
                    glowColor={THEME.aurora.tertiary}
                    size={72}
                  />
                );
              })}
          </div>
        </section>

        {/* Chat Sidebar - Glass Effect */}
        <AnimatePresence>
          {showChat && (
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, type: "spring", damping: 25 }}
              className="w-full md:w-[420px] border-l flex flex-col min-h-0 shrink-0 backdrop-blur-xl"
              style={{
                background: "rgba(20, 20, 37, 0.8)",
                borderColor: THEME.border,
              }}
            >
              {/* Chat Header */}
              <div
                className="px-4 py-3 border-b flex items-center justify-between shrink-0"
                style={{ borderColor: THEME.border }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles
                    className="w-4 h-4"
                    style={{ color: THEME.aurora.primary }}
                  />
                  <span
                    className="font-semibold text-sm"
                    style={{ color: THEME.text.primary }}
                  >
                    Chat
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: THEME.border,
                      color: THEME.text.muted,
                    }}
                  >
                    {messages.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {typingUsers.size > 0 && (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="text-xs flex items-center gap-1"
                      style={{ color: THEME.aurora.primary }}
                    >
                      <span className="flex gap-0.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <motion.span
                            key={i}
                            className="w-1 h-1 rounded-full"
                            style={{ background: THEME.aurora.primary }}
                            animate={{ y: [0, -4, 0] }}
                            transition={{
                              duration: 0.6,
                              delay: i * 0.15,
                              repeat: Infinity,
                            }}
                          />
                        ))}
                      </span>
                      {typingUsers.size} typing
                    </motion.div>
                  )}
                  <button
                    onClick={() => setShowChat(false)}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: THEME.text.muted }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={chatScrollRef}
                className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: `${THEME.border} transparent`,
                }}
              >
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <GlassMessage
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
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: "rgba(167, 139, 250, 0.1)" }}
                    >
                      <MessageCircle
                        className="w-8 h-8"
                        style={{ color: THEME.aurora.primary }}
                      />
                    </div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: THEME.text.primary }}
                    >
                      No messages yet
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: THEME.text.muted }}
                    >
                      Be the first to start the conversation ✨
                    </p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Reply Bar */}
              <AnimatePresence>
                {replyTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-3 py-2 border-t flex items-center justify-between shrink-0"
                    style={{
                      borderColor: THEME.border,
                      background: "rgba(20, 20, 37, 0.5)",
                    }}
                  >
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <Reply
                        className="w-4 h-4 shrink-0"
                        style={{ color: THEME.aurora.primary }}
                      />
                      <div className="min-w-0">
                        <div
                          className="text-[10px] font-mono uppercase tracking-wider"
                          style={{ color: THEME.text.muted }}
                        >
                          Replying to {replyTo.sender?.name}
                        </div>
                        <span
                          className="text-xs truncate block max-w-[200px]"
                          style={{ color: THEME.text.secondary }}
                        >
                          {replyTo.content}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
                      style={{ color: THEME.text.muted }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Bar */}
              <div
                className="p-3 border-t flex gap-2 shrink-0"
                style={{ borderColor: THEME.border }}
              >
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors shrink-0"
                  style={{ color: THEME.text.muted }}
                >
                  <Smile className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    sendTyping(e.target.value.length > 0);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-full text-sm outline-none transition-all border"
                  style={{
                    background: "rgba(10, 10, 18, 0.5)",
                    color: THEME.text.primary,
                    borderColor: THEME.border,
                  }}
                />

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
                    color: "#fff",
                  }}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Emoji Picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-2 border-t flex flex-wrap gap-1"
                    style={{
                      borderColor: THEME.border,
                      background: "rgba(10, 10, 18, 0.5)",
                    }}
                  >
                    {[
                      "😊",
                      "😂",
                      "❤️",
                      "🔥",
                      "👍",
                      "👏",
                      "🙏",
                      "🎉",
                      "😍",
                      "🤔",
                      "😭",
                      "🥺",
                      "💯",
                      "✨",
                      "🌟",
                      "🎊",
                      "🚀",
                      "💪",
                      "🤗",
                      "🥰",
                      "😎",
                      "🤩",
                      "😇",
                      "🤣",
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setNewMessage((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-xl transition-all hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* Control Bar - Glass Effect */}
      <footer
        className="relative z-10 px-6 py-4 border-t flex items-center justify-center gap-4 shrink-0 flex-wrap backdrop-blur-xl"
        style={{
          background: "rgba(20, 20, 37, 0.8)",
          borderColor: THEME.border,
        }}
      >
        {/* Mute Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            toggleMute();
            setIsMuted(!isMuted);
          }}
          disabled={isMockMode}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all ${
            isMockMode ? "opacity-50 cursor-not-allowed" : ""
          }`}
          style={
            isMuted || isMockMode
              ? {
                  background: "rgba(122, 114, 160, 0.1)",
                  border: `1px solid ${THEME.border}`,
                  color: THEME.text.muted,
                }
              : {
                  background: `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
                  color: "#fff",
                  boxShadow: `0 0 30px ${THEME.aurora.primary}33`,
                }
          }
        >
          {isMuted || isMockMode ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
          {isMockMode ? "Demo" : isMuted ? "Unmute" : "Mute"}
        </motion.button>

        {/* Raise Hand Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRaiseHand}
          disabled={isRaisingHand}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, #FCD34D, #F59E0B)`,
            color: "#0A0A12",
            boxShadow: "0 0 30px rgba(251, 191, 36, 0.2)",
          }}
        >
          <Hand className="w-4 h-4" />
          {isRaisingHand ? "Raised! ✋" : "Raise Hand"}
        </motion.button>

        {/* Host Actions */}
        {isHost && !isMockMode && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              voiceApi
                .startRecording(roomId)
                .then(() => {
                  toast.success("🎙️ Recording started");
                  refetch();
                })
                .catch(() => toast.error("Failed to start recording"));
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid #EF4444",
              color: "#EF4444",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-red-500"
            />
            Record
          </motion.button>
        )}

        {/* Leave Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLeave}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#F87171",
          }}
        >
          <PhoneOff className="w-4 h-4" />
          Leave
        </motion.button>
      </footer>
    </div>
  );
};

// Helper function for time formatting
function formatTime(date: string) {
  try {
    return format(new Date(date), "h:mm a");
  } catch {
    return "";
  }
}
