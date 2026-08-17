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
  Minimize2,
  Volume2,
  VolumeOff,
  Smile,
  Link2,
  Radio,
  TrendingUp,
  Circle,
  Sparkles,
  Settings,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

// ---- Types ----
interface VoiceRoomViewProps {
  roomId: string;
  onLeave: () => void;
  onMinimize?: (roomData: {
    id: string;
    name: string;
    participants: any[];
    type: string;
    participantCount: number;
  }) => void;
}

// ---- Theme ----
const THEME = {
  void: "#0A0A12",
  surface: "#141425",
  surfaceRaised: "#1E1E38",
  surfaceHover: "#2A2A4A",
  border: "#2A2A4A",
  borderGlow: "rgba(120, 80, 255, 0.2)",
  aurora: {
    primary: "#7C6AFF",
    secondary: "#A78BFA",
    tertiary: "#6EE7B7",
    quaternary: "#FCD34D",
    pink: "#F472B6",
    cyan: "#67E8F9",
    purple: "#8B5CF6",
    blue: "#3B82F6",
    green: "#34D399",
    red: "#EF4444",
    orange: "#F59E0B",
    yellow: "#FBBF24",
  },
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
    waiting: "#FCD34D",
    waitingGlow: "rgba(252, 211, 77, 0.3)",
  },
};

// ---- Helper Functions ----
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

function formatTime(date: string) {
  try {
    return format(new Date(date), "h:mm a");
  } catch {
    return "";
  }
}

// ---- Custom Leave Confirmation Modal ----
const LeaveConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-[70] px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="rounded-3xl w-full max-w-md p-6 border"
        style={{ background: THEME.surface, borderColor: THEME.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(239, 68, 68, 0.15)" }}
          >
            <PhoneOff className="w-8 h-8" style={{ color: "#EF4444" }} />
          </div>
          <h3
            className="font-serif text-xl mb-2"
            style={{ color: THEME.text.primary }}
          >
            Leave Room?
          </h3>
          <p className="text-sm mb-6" style={{ color: THEME.text.muted }}>
            Are you sure you want to leave this room? You can always join back
            later.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: THEME.text.muted }}
            >
              Stay
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-80"
              style={{ background: "#EF4444", color: "#fff" }}
            >
              Leave Room
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ---- Sub-components ----

// 1. ParticleBackground
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

// 2. EnergyOrbs
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

// 3. SoundWaveVisualizer
const SoundWaveVisualizer: React.FC<{
  isActive: boolean;
  intensity?: number;
}> = ({ isActive, intensity = 0.5 }) => {
  const bars = 32;
  const [heights, setHeights] = useState<number[]>(Array(bars).fill(0));

  useEffect(() => {
    if (!isActive) {
      setHeights(Array(bars).fill(0));
      return;
    }

    const interval = setInterval(() => {
      setHeights((prev) =>
        prev.map(() => {
          const random = Math.random() * 0.8 + 0.2;
          return Math.min(
            1,
            (prev.length > 0 ? prev[0] : 0) * 0.3 + random * 0.7 * intensity,
          );
        }),
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, intensity, bars]);

  return (
    <div className="flex items-center gap-[2px] h-12">
      {heights.map((height, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          animate={{ height: `${Math.max(8, height * 60)}%` }}
          transition={{ duration: 0.1 }}
          style={{
            background: isActive
              ? `linear-gradient(to top, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`
              : THEME.border,
            opacity: isActive ? 0.6 + height * 0.4 : 0.2,
          }}
        />
      ))}
    </div>
  );
};

// 4. ParticipantCard
const ParticipantCard: React.FC<{
  name: string;
  avatarUrl?: string;
  isHost: boolean;
  isSpeaking: boolean;
  isActive: boolean;
  isMuted?: boolean;
  raisedHand?: boolean;
  onMute?: () => void;
  onKick?: () => void;
  onPromote?: () => void;
  isCurrentUser?: boolean;
  isModerator?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}> = ({
  name,
  avatarUrl,
  isHost,
  isSpeaking,
  isActive,
  isMuted = false,
  raisedHand = false,
  onMute,
  onKick,
  onPromote,
  isCurrentUser = false,
  isModerator = false,
  size = "md",
  onClick,
}) => {
  const hue = hueFromString(name);
  const sizeMap = {
    sm: { avatar: 48, text: "text-xs", gap: "gap-1.5" },
    md: { avatar: 64, text: "text-sm", gap: "gap-2" },
    lg: { avatar: 80, text: "text-base", gap: "gap-2.5" },
  };
  const s = sizeMap[size];
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 20 }}
      className={`flex flex-col items-center cursor-pointer group ${onClick ? "hover:opacity-80" : ""}`}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative">
        {isSpeaking && (
          <motion.div
            className="absolute inset-[-3px] rounded-full"
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              border: `2px solid ${THEME.aurora.primary}`,
              boxShadow: `0 0 30px ${THEME.aurora.primary}44`,
            }}
          />
        )}

        <div
          className="relative rounded-full flex items-center justify-center font-semibold border-2 shadow-lg"
          style={{
            width: s.avatar,
            height: s.avatar,
            background: avatarUrl
              ? `url(${avatarUrl}) center/cover`
              : `hsl(${hue}, 50%, 22%)`,
            borderColor: isActive
              ? isSpeaking
                ? THEME.aurora.primary
                : THEME.status.live
              : THEME.border,
            color: avatarUrl ? "transparent" : THEME.text.primary,
            fontSize: s.avatar / 3,
            boxShadow: isActive
              ? isSpeaking
                ? `0 0 40px ${THEME.aurora.primary}44`
                : `0 0 20px ${THEME.status.liveGlow}`
              : "none",
          }}
        >
          {!avatarUrl && initials(name)}
        </div>

        {isActive && !isMuted && (
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              background: isSpeaking ? THEME.aurora.primary : THEME.status.live,
              borderColor: THEME.surface,
              boxShadow: isSpeaking
                ? `0 0 12px ${THEME.aurora.primary}66`
                : `0 0 12px ${THEME.status.liveGlow}`,
            }}
          />
        )}

        {isMuted && isActive && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 bg-gray-500 border-slate-800">
            <MicOff className="w-2 h-2 absolute -top-0.5 -right-0.5 text-gray-300" />
          </div>
        )}

        {isHost && (
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Crown className="w-4 h-4 text-yellow-400 drop-shadow-lg" />
          </motion.div>
        )}

        {raisedHand && (
          <motion.div
            className="absolute -top-2 -left-2"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <Hand className="w-4 h-4 text-yellow-400 drop-shadow-lg" />
          </motion.div>
        )}

        {isCurrentUser && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-purple-500 text-white whitespace-nowrap">
            You
          </div>
        )}
      </div>

      <span
        className={`mt-2 font-medium truncate max-w-[80px] ${s.text}`}
        style={{ color: THEME.text.primary }}
      >
        {name}
      </span>

      <span className="text-[10px]" style={{ color: THEME.text.muted }}>
        {isMuted
          ? "🔇 muted"
          : isActive
            ? isSpeaking
              ? "🔊 speaking"
              : "🎧 listening"
            : "💤 away"}
      </span>

      {isModerator && !isCurrentUser && showActions && (
        <div className="absolute top-0 right-0 flex gap-1 bg-black/80 p-1 rounded-lg backdrop-blur-sm">
          {onMute && (
            <button
              onClick={onMute}
              className="p-1 hover:bg-white/10 rounded"
              title="Mute"
            >
              <VolumeX className="w-3 h-3 text-white" />
            </button>
          )}
          {onKick && (
            <button
              onClick={onKick}
              className="p-1 hover:bg-red-500/20 rounded"
              title="Kick"
            >
              <UserX className="w-3 h-3 text-red-400" />
            </button>
          )}
          {onPromote && (
            <button
              onClick={onPromote}
              className="p-1 hover:bg-yellow-500/20 rounded"
              title="Make Host"
            >
              <Crown className="w-3 h-3 text-yellow-400" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

// 5. GlassMessage
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
          {message.isPinned && (
            <div className="flex items-center gap-1 text-xs font-medium text-amber-400 mb-1">
              <Pin className="w-3 h-3" /> Pinned
            </div>
          )}
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
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: THEME.text.primary }}
          >
            {message.content}
          </p>
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

// 6. AdvancedAudioControls
const AdvancedAudioControls: React.FC<{
  isMuted: boolean;
  onToggleMute: () => void;
  isDeafened: boolean;
  onToggleDeafen: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onLeave: () => void;
  isHost: boolean;
}> = ({
  isMuted,
  onToggleMute,
  isDeafened,
  onToggleDeafen,
  volume,
  onVolumeChange,
  onLeave,
  isHost,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border"
      style={{
        background: "rgba(20, 20, 37, 0.8)",
        borderColor: THEME.border,
        boxShadow: "0 0 30px rgba(0,0,0,0.3)",
      }}
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleMute}
        className="relative p-2 rounded-full transition-all"
        style={{
          background: isMuted
            ? "rgba(239, 68, 68, 0.2)"
            : "rgba(110, 231, 183, 0.15)",
        }}
      >
        {isMuted ? (
          <MicOff className="w-4 h-4 text-red-400" />
        ) : (
          <Mic className="w-4 h-4 text-green-400" />
        )}
        {!isMuted && (
          <motion.span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>

      <div
        className="relative flex items-center"
        onMouseEnter={() => setShowVolumeSlider(true)}
        onMouseLeave={() => setShowVolumeSlider(false)}
      >
        <button
          onClick={onToggleDeafen}
          className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
          style={{
            color: isDeafened ? THEME.text.muted : THEME.text.secondary,
          }}
        >
          {isDeafened ? (
            <VolumeOff className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>

        <AnimatePresence>
          {showVolumeSlider && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 80 }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <input
                type="range"
                min="0"
                max="100"
                value={isDeafened ? 0 : volume}
                onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                className="w-20 h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${THEME.aurora.primary} ${isDeafened ? 0 : volume}%, ${THEME.border} ${isDeafened ? 0 : volume}%)`,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-px h-6" style={{ background: THEME.border }} />

      {isHost && (
        <>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
            style={{ color: THEME.text.muted }}
            title="Record Room"
          >
            <Circle className="w-3.5 h-3.5" />
          </motion.button>
          <div className="w-px h-6" style={{ background: THEME.border }} />
        </>
      )}

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLeave}
        className="p-2 rounded-full transition-colors hover:bg-red-500/20"
        style={{ color: "#EF4444" }}
        title="Leave Room"
      >
        <PhoneOff className="w-4 h-4" />
      </motion.button>
    </div>
  );
};

// ---- Main Component ----
export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({
  roomId,
  onLeave,
  onMinimize,
}) => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<VoiceMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isRaisingHand, setIsRaisingHand] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [reactions, setReactions] = useState<{ id: string; emoji: string }[]>(
    [],
  );
  const [isRecording, setIsRecording] = useState(false);
  const [roomDuration, setRoomDuration] = useState(0);
  const [showLiveStats, setShowLiveStats] = useState(false);

  // State for leave confirmation modal
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // ✅ Retry state for room loading
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimer, setRetryTimer] = useState<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Data queries
  const { data: room, isLoading, refetch, error } = useVoiceRoom(roomId);
  const { data: initialMessages } = useRoomMessages(roomId);
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
    onAudioLevel: (level) => setAudioLevel(level),
  });
  const {
    isConnected: isLiveKitConnected,
    participants: livekitParticipants = [],
    remoteTracks = {},
    toggleMute,
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

  const speakingCount = useMemo(() => {
    return (
      livekitParticipants?.filter(
        (p: any) => remoteTracks?.[p.identity] || false,
      ).length || 0
    );
  }, [livekitParticipants, remoteTracks]);

  // Load messages
  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  // Room duration
  useEffect(() => {
    if (room?.startedAt) {
      const start = new Date(room.startedAt).getTime();
      durationIntervalRef.current = setInterval(() => {
        setRoomDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => {
        if (durationIntervalRef.current)
          clearInterval(durationIntervalRef.current);
      };
    }
  }, [room?.startedAt]);

  // ✅ Retry logic when room is not found
  useEffect(() => {
    // Clear any existing timer
    if (retryTimer) {
      clearTimeout(retryTimer);
      setRetryTimer(null);
    }

    // If there's an error or room is null and we haven't exceeded max retries
    if ((error || !room) && retryCount < maxRetries && !isLoading) {
      const delay = 1000 * (retryCount + 1); // 1s, 2s, 3s
      const timer = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        refetch();
      }, delay);
      setRetryTimer(timer);
    }

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        setRetryTimer(null);
      }
    };
  }, [error, room, retryCount, isLoading, refetch]);

  // Reset retry count when room loads successfully
  useEffect(() => {
    if (room) {
      setRetryCount(0);
      if (retryTimer) {
        clearTimeout(retryTimer);
        setRetryTimer(null);
      }
    }
  }, [room]);

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

  // Socket handlers with typing indicator
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

    const handleReaction = (data: { userId: string; emoji: string }) => {
      if (data.userId !== user?.id) {
        const id = `${Date.now()}-${Math.random()}`;
        setReactions((prev) => [...prev, { id, emoji: data.emoji }]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2000);
      }
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
    socket.on("voice:reaction", handleReaction);
    socket.on("voice:message-deleted", handleMessageDeleted);
    socket.on("voice:message-pinned", handleMessagePinned);
    socket.on("voice:typing", handleTyping);

    return () => {
      socket.off("voice:chat", handleNewMessage);
      socket.off("voice:reaction", handleReaction);
      socket.off("voice:message-deleted", handleMessageDeleted);
      socket.off("voice:message-pinned", handleMessagePinned);
      socket.off("voice:typing", handleTyping);
    };
  }, [socket, showChat, user?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        handleToggleMute();
      }
      if (e.key === "Escape" && showChat) {
        setShowChat(false);
      }
      if (e.ctrlKey && e.shiftKey && e.key === "H") {
        e.preventDefault();
        handleRaiseHand();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showChat]);

  // Scroll chat to bottom
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

  // Send reaction
  const sendReaction = useCallback(
    (emoji: string) => {
      if (socket && isConnected) {
        socket.emit("voice:reaction", { roomId, emoji });
      }
      const id = `${Date.now()}-${Math.random()}`;
      setReactions((prev) => [...prev, { id, emoji }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2000);
    },
    [socket, isConnected, roomId],
  );

  const handleRaiseHand = () => {
    setIsRaisingHand(true);
    raiseHand(true);
    toast.success("✋ Hand raised!");
    setTimeout(() => setIsRaisingHand(false), 3000);
  };

  // Updated handleLeave with custom modal
  const handleLeave = () => {
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = async () => {
    try {
      await leaveRoomMutation.mutateAsync(roomId);
      socket?.emit("voice:leave", { roomId });
      toast.success("Left room");
      onLeave();
    } catch (error) {
      toast.error("Failed to leave room");
    }
  };

  const handleToggleMute = () => {
    toggleMute();
    setIsMuted(!isMuted);
  };

  const handleToggleDeafen = () => {
    setIsDeafened(!isDeafened);
    if (!isDeafened) {
      toast.info("🔇 Audio muted for all speakers");
    } else {
      toast.info("🔊 Audio restored");
    }
  };

  const handleStartRecording = async () => {
    try {
      await voiceApi.startRecording(roomId);
      setIsRecording(true);
      toast.success("🎙️ Recording started");
      refetch();
    } catch (error) {
      toast.error("Failed to start recording");
    }
  };

  const handleStopRecording = async () => {
    try {
      await voiceApi.stopRecording(roomId);
      setIsRecording(false);
      toast.success("⏹️ Recording stopped");
      refetch();
    } catch (error) {
      toast.error("Failed to stop recording");
    }
  };

  const isHost = hostId === user?.id || room?.creatorId === user?.id;
  const isModerator =
    isHost ||
    allParticipants.some(
      (p: any) => p.userId === user?.id && p.role === "MODERATOR",
    );
  const totalParticipants = Math.max(
    allParticipants.length,
    livekitParticipants?.length || 1,
  );

  // Get typing users names
  const typingUsersNames = useMemo(() => {
    return Array.from(typingUsers)
      .map((id) => {
        const participant = allParticipants.find((p) => p.userId === id);
        return participant?.user?.name || id;
      })
      .filter(Boolean);
  }, [typingUsers, allParticipants]);

  // ✅ FIXED: Loading state with retry information
  if (isLoading || isJoining || (retryCount < maxRetries && !room)) {
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
            {retryCount > 0
              ? "⏳ Room is being prepared..."
              : isJoining
                ? "🎧 Joining the conversation..."
                : "Loading room..."}
          </p>
          {retryCount > 0 && retryCount < maxRetries && (
            <p className="text-xs mt-2" style={{ color: THEME.text.muted }}>
              Retrying... ({retryCount}/{maxRetries})
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  // ✅ FIXED: Room not found - only after all retries fail
  if (!room && retryCount >= maxRetries) {
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
            {error
              ? "Unable to load this room. It may have been deleted or you don't have access."
              : "This room may have ended or the link is incorrect."}
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

  // ✅ If room is still not found but retries haven't completed yet, show loading
  if (!room) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: THEME.void, color: THEME.text.muted }}
      >
        <div className="text-center">
          <Loader2
            className="w-12 h-12 mx-auto mb-4 animate-spin"
            style={{ color: THEME.aurora.primary }}
          />
          <p className="text-sm" style={{ color: THEME.text.secondary }}>
            Loading room...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden relative"
      style={{ background: THEME.void }}
    >
      {/* Background Effects */}
      <ParticleBackground />
      <EnergyOrbs count={4} />

      {/* Reaction Animations */}
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ opacity: 1, scale: 0.5, y: 0 }}
            animate={{ opacity: 0, scale: 1.5, y: -80 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="fixed pointer-events-none text-3xl z-50"
            style={{
              left: `${30 + Math.random() * 40}%`,
              top: `${30 + Math.random() * 40}%`,
            }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Top Bar */}
      <header
        className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b shrink-0 backdrop-blur-xl"
        style={{
          background: "rgba(20, 20, 37, 0.8)",
          borderColor: THEME.border,
        }}
      >
        <div className="flex items-center gap-4 min-w-0">
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
              {isRecording && (
                <span
                  className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#EF4444",
                  }}
                >
                  <Circle className="w-3 h-3" /> Recording
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
          {/* MINIMIZE BUTTON */}
          <button
            onClick={() => {
              if (onMinimize) {
                onMinimize({
                  id: roomId,
                  name: room?.name || "Voice Room",
                  participants: allParticipants,
                  type: room?.type || "OPEN",
                  participantCount: totalParticipants,
                });
              }
            }}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
            style={{ color: THEME.text.muted }}
            title="Minimize Room (floating window)"
          >
            <Minimize2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowLiveStats(!showLiveStats)}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
            style={{
              color: showLiveStats ? THEME.aurora.primary : THEME.text.muted,
            }}
            title="Live Stats"
          >
            <TrendingUp className="w-4 h-4" />
          </button>

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

          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/voice/${roomId}`,
              );
              toast.success("📋 Room link copied!");
            }}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
            style={{ color: THEME.text.muted }}
          >
            <Link2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Live Stats Bar */}
      <AnimatePresence>
        {showLiveStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-b backdrop-blur-sm"
            style={{
              borderColor: THEME.border,
              background: "rgba(20, 20, 37, 0.5)",
            }}
          >
            <div className="flex items-center gap-3">
              {[
                {
                  icon: Users,
                  label: "Participants",
                  value: totalParticipants,
                },
                { icon: Volume2, label: "Speaking", value: speakingCount },
                {
                  icon: Clock,
                  label: "Duration",
                  value: `${Math.floor(roomDuration / 60)}m`,
                },
                {
                  icon: MessageCircle,
                  label: "Messages",
                  value: messages.length,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <stat.icon
                    className="w-3 h-3"
                    style={{ color: THEME.text.muted }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: THEME.text.secondary }}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <main className="flex flex-1 min-h-0 relative z-10">
        {/* Participants Grid */}
        <section
          className={`flex-1 min-w-0 px-4 sm:px-6 py-4 sm:py-8 transition-all duration-300 overflow-y-auto ${
            showChat ? "md:w-2/3" : "w-full"
          }`}
          style={{
            backgroundImage: `radial-gradient(ellipse 60% 40% at 50% 20%, ${THEME.gradient.from}, transparent 70%)`,
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {/* Current User */}
            <ParticipantCard
              name={user?.name || "You"}
              avatarUrl={user?.avatarUrl}
              isHost={isHost}
              isSpeaking={audioLevel > 0.1}
              isActive={!isMuted && isLiveKitConnected}
              isMuted={isMuted}
              raisedHand={false}
              isCurrentUser={true}
              size="md"
            />

            {/* Remote Participants */}
            {!isMockMode &&
              livekitParticipants?.map((p: any) => {
                const hasAudio = remoteTracks?.[p.identity] || false;
                const isParticipantHost = hostId === p.identity;

                return (
                  <ParticipantCard
                    key={p.identity}
                    name={p.name || p.identity}
                    avatarUrl={p.avatarUrl}
                    isHost={isParticipantHost}
                    isSpeaking={hasAudio}
                    isActive={true}
                    isMuted={false}
                    isModerator={isModerator}
                    onMute={() => muteUser(p.identity)}
                    onKick={() => kickUser(p.identity)}
                    onPromote={() => promoteHost(p.identity)}
                    size="md"
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
                  <ParticipantCard
                    key={p.userId}
                    name={name}
                    avatarUrl={p.user?.avatarUrl}
                    isHost={isParticipantHost}
                    isSpeaking={false}
                    isActive={false}
                    raisedHand={p.raisedHand}
                    isModerator={isModerator}
                    onMute={() => muteUser(p.userId)}
                    onKick={() => kickUser(p.userId)}
                    onPromote={() => promoteHost(p.userId)}
                    size="md"
                  />
                );
              })}
          </div>
        </section>

        {/* Chat Sidebar */}
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

              {/* Typing indicator display in chat */}
              {typingUsers.size > 0 && (
                <div
                  className="px-4 py-1.5 text-xs italic"
                  style={{ color: THEME.text.muted }}
                >
                  {typingUsersNames.length > 0 && (
                    <span>
                      {typingUsersNames.join(", ")}{" "}
                      {typingUsersNames.length === 1 ? "is" : "are"} typing...
                    </span>
                  )}
                </div>
              )}

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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 rounded-full hover:bg-white/5 transition-colors shrink-0"
                    style={{ color: THEME.text.muted }}
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  <div className="flex gap-0.5">
                    {["❤️", "🔥", "👏", "🎉", "💯"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => sendReaction(emoji)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-sm transition-all hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    sendTyping(e.target.value.length > 0);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message... (Ctrl+Shift+M to mute)"
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

      {/* Control Bar */}
      <footer
        className="relative z-10 px-4 sm:px-6 py-3 border-t flex items-center justify-center gap-3 shrink-0 flex-wrap backdrop-blur-xl"
        style={{
          background: "rgba(20, 20, 37, 0.8)",
          borderColor: THEME.border,
        }}
      >
        <AdvancedAudioControls
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isDeafened={isDeafened}
          onToggleDeafen={handleToggleDeafen}
          volume={volume}
          onVolumeChange={setVolume}
          onLeave={handleLeave}
          isHost={isHost}
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRaiseHand}
          disabled={isRaisingHand}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, #FCD34D, #F59E0B)`,
            color: "#0A0A12",
            boxShadow: "0 0 30px rgba(251, 191, 36, 0.2)",
          }}
        >
          <Hand className="w-4 h-4" />
          {isRaisingHand ? "Raised! ✋" : "Raise Hand"}
        </motion.button>

        {isHost && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all"
            style={{
              background: isRecording
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(239, 68, 68, 0.1)",
              border: `1px solid ${isRecording ? "#EF4444" : "rgba(239, 68, 68, 0.3)"}`,
              color: isRecording ? "#EF4444" : "#F87171",
            }}
          >
            {isRecording ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-red-500"
                />
                Stop Recording
              </>
            ) : (
              <>
                <Circle className="w-4 h-4" />
                Record
              </>
            )}
          </motion.button>
        )}
      </footer>

      {/* Mobile Quick Actions */}
      <div className="md:hidden fixed bottom-20 right-4 z-20 flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleRaiseHand}
          className="p-3 rounded-full shadow-lg"
          style={{ background: THEME.aurora.quaternary, color: THEME.void }}
        >
          <Hand className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleToggleMute}
          className="p-3 rounded-full shadow-lg"
          style={{
            background: isMuted
              ? "rgba(239, 68, 68, 0.2)"
              : THEME.aurora.primary,
            color: isMuted ? "#EF4444" : "#fff",
          }}
        >
          {isMuted ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      {/* Custom Leave Confirmation Modal */}
      <LeaveConfirmationModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleConfirmLeave}
      />

      {/* Keyboard shortcut hint */}
      <div className="fixed bottom-24 left-4 z-20 hidden md:block">
        <div className="text-[10px] text-slate-500 opacity-50 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
          ⌘+⇧+M to mute · Esc to close chat
        </div>
      </div>
    </div>
  );
};
