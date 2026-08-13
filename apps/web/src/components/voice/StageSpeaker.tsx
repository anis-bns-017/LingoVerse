import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  useVoiceRoom,
  useAddToStage,
  useRemoveFromStage,
  useVoiceSocket,
} from "../../hooks/useVoice";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Hand,
  Crown,
  Mic,
  MicOff,
  X,
  UserPlus,
  ArrowLeft,
  Users,
  Star,
  Sparkles,
  Zap,
  Flame,
  Shield,
  ShieldCheck,
  Award,
  Trophy,
  Medal,
  Gem,
  Diamond,
  Heart,
  ThumbsUp,
  Gift,
  PartyPopper,
  Confetti,
  Music,
  Radio,
  Volume2,
  VolumeX,
  Headphones,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Loader2,
  MoreVertical,
  Check,
  CheckCheck,
  Send,
  Reply,
  Pin,
  Trash2,
  Edit,
  Copy,
  Link2,
  Share2,
} from "lucide-react";
import { format } from "date-fns";

interface StageSpeakerProps {
  roomId: string;
  onLeave?: () => void;
}

// ---- Premium Theme ----
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

// ---- Background Particles ----
const StageParticles: React.FC = () => {
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
    const count = 60;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.05,
        angle: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.3 + 0.05,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.angle += 0.005;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${p.opacity})`;
        ctx.fill();
      });

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
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

// ---- Stage Spotlight ----
const StageSpotlight: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      animate={{
        opacity: isActive ? 1 : 0,
      }}
      transition={{ duration: 0.8 }}
      style={{
        background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${THEME.aurora.primary}11, transparent 70%)`,
      }}
    />
  );
};

// ---- Speaker Avatar with Glow ----
const SpeakerAvatar: React.FC<{
  name: string;
  isLive: boolean;
  isHost: boolean;
  isSpeaking?: boolean;
  size?: number;
  onRemove?: () => void;
  canRemove?: boolean;
  isPending?: boolean;
}> = ({
  name,
  isLive,
  isHost,
  isSpeaking = false,
  size = 80,
  onRemove,
  canRemove,
  isPending = false,
}) => {
  const hue = hueFromString(name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 20 }}
      className="flex flex-col items-center group"
    >
      <div className="relative">
        {/* Glow Ring */}
        {isLive && (
          <motion.div
            className="absolute inset-[-6px] rounded-full"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              background: `radial-gradient(circle, ${THEME.aurora.primary}44, transparent 70%)`,
              filter: "blur(8px)",
            }}
          />
        )}

        {/* Speaking Pulse */}
        {isSpeaking && (
          <motion.div
            className="absolute inset-[-4px] rounded-full border-2"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ borderColor: THEME.aurora.secondary }}
          />
        )}

        {/* Avatar */}
        <motion.div
          className="relative rounded-full flex items-center justify-center font-serif font-bold border-2 shadow-lg"
          style={{
            width: size,
            height: size,
            background: `hsl(${hue}, 50%, 22%)`,
            borderColor: isLive ? THEME.aurora.primary : THEME.border,
            color: THEME.text.primary,
            boxShadow: isLive ? `0 0 40px ${THEME.aurora.primary}33` : "none",
            fontSize: size / 3,
          }}
          whileHover={{ scale: 1.03 }}
        >
          {initials(name)}

          {/* Live Dot */}
          {isLive && (
            <motion.div
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
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

        {/* Remove Button */}
        {canRemove && onRemove && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRemove}
            disabled={isPending}
            className="absolute -top-2 -right-2 p-1 rounded-full shadow-lg transition-all disabled:opacity-50"
            style={{
              background: THEME.surfaceRaised,
              border: `1px solid ${THEME.border}`,
              color: THEME.text.muted,
            }}
          >
            {isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <X className="w-3 h-3" />
            )}
          </motion.button>
        )}
      </div>

      {/* Name */}
      <span
        className="text-sm font-medium mt-2 truncate max-w-[80px] text-center"
        style={{ color: THEME.text.primary }}
      >
        {name}
      </span>

      {/* Status */}
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
        ) : isLive ? (
          "live"
        ) : (
          "muted"
        )}
      </span>
    </motion.div>
  );
};

// ---- Listener Card ----
const ListenerCard: React.FC<{
  participant: any;
  isModerator: boolean;
  isFull: boolean;
  isPending: boolean;
  onAddToStage: () => void;
}> = ({ participant, isModerator, isFull, isPending, onAddToStage }) => {
  const hue = hueFromString(participant.user.name);
  const hasRaisedHand = participant.raisedHand;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        hasRaisedHand
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-white/5 hover:border-white/10"
      }`}
      style={{
        background: hasRaisedHand
          ? "rgba(252, 211, 77, 0.05)"
          : "rgba(255,255,255,0.02)",
      }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
        style={{
          background: `hsl(${hue}, 40%, 22%)`,
          color: THEME.text.primary,
          border: hasRaisedHand ? `2px solid ${THEME.status.waiting}` : "none",
        }}
      >
        {initials(participant.user.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium truncate"
            style={{ color: THEME.text.primary }}
          >
            {participant.user.name}
          </span>
          {hasRaisedHand && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="flex items-center gap-1 text-[10px] font-medium"
              style={{ color: THEME.status.waiting }}
            >
              <Hand className="w-3 h-3" />
              waiting
            </motion.div>
          )}
        </div>
      </div>

      {/* Actions */}
      {isModerator && (
        <div className="flex items-center gap-1 shrink-0">
          {hasRaisedHand && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAddToStage}
              disabled={isFull || isPending}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
                color: "#fff",
              }}
            >
              {isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Bring Up"
              )}
            </motion.button>
          )}

          {!hasRaisedHand && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAddToStage}
              disabled={isFull || isPending}
              className="p-2 rounded-full transition-colors hover:bg-white/5 disabled:opacity-40"
              style={{ color: THEME.text.muted }}
              title="Invite to stage"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ---- Main Component ----
export const StageSpeaker: React.FC<StageSpeakerProps> = ({
  roomId,
  onLeave,
}) => {
  const { user } = useAuth();
  const { data: room, isLoading, refetch } = useVoiceRoom(roomId);
  const { socket } = useVoiceSocket(roomId, user?.id || "");
  const addToStage = useAddToStage();
  const removeFromStage = useRemoveFromStage();

  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [showHand, setShowHand] = useState(false);
  const [isRaisingHand, setIsRaisingHand] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: THEME.void }}
      >
        <div className="text-center">
          <Loader2
            className="w-10 h-10 animate-spin mx-auto mb-3"
            style={{ color: THEME.aurora.primary }}
          />
          <p style={{ color: THEME.text.muted }}>Raising the curtain...</p>
        </div>
      </div>
    );
  }

  if (!room || room.type !== "STAGE") {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: THEME.void }}
      >
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(167, 139, 250, 0.1)" }}
          >
            <Radio
              className="w-8 h-8"
              style={{ color: THEME.aurora.primary }}
            />
          </div>
          <h2
            className="text-2xl font-serif mb-2"
            style={{ color: THEME.text.primary }}
          >
            No Stage Here
          </h2>
          <p style={{ color: THEME.text.muted }}>
            This room isn't set up as a stage.
          </p>
          {onLeave && (
            <button
              onClick={onLeave}
              className="mt-6 px-6 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105"
              style={{ background: THEME.aurora.primary, color: "#fff" }}
            >
              Back to Rooms
            </button>
          )}
        </div>
      </div>
    );
  }

  const stage = room.stages[0];
  if (!stage) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: THEME.void }}
      >
        <p style={{ color: THEME.text.muted }}>
          The stage hasn't been built yet.
        </p>
      </div>
    );
  }

  const speakers = stage.speakers || [];
  const listeners = room.participants.filter((p) => p.role === "LISTENER");
  const isSpeaker = speakers.includes(user?.id || "");
  const isModerator = room.participants.some(
    (p) =>
      p.userId === user?.id &&
      (p.role === "MODERATOR" || p.userId === room.creatorId),
  );
  const isFull = speakers.length >= 5;
  const raisedHandCount = listeners.filter((l) => l.raisedHand).length;

  // Filter listeners by search
  const filteredListeners = useMemo(() => {
    if (!searchQuery) return listeners;
    const q = searchQuery.toLowerCase();
    return listeners.filter((l) => l.user.name.toLowerCase().includes(q));
  }, [listeners, searchQuery]);

  const handleAddToStage = async (userId: string) => {
    if (isFull) {
      toast.error("The stage is full — 5 speakers max");
      return;
    }
    setPendingUserId(userId);
    try {
      await addToStage.mutateAsync({ roomId, userId });
      toast.success("✨ Invited to the stage!");
      refetch();
    } catch {
      toast.error("Couldn't add them to the stage");
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRemoveFromStage = async (userId: string) => {
    setPendingUserId(userId);
    try {
      await removeFromStage.mutateAsync({ roomId, userId });
      toast.success("Stepped off the stage");
      refetch();
    } catch {
      toast.error("Couldn't remove them from the stage");
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRaiseHand = () => {
    setIsRaisingHand(true);
    socket?.emit("voice:raise-hand", { roomId, raise: true });
    setShowHand(true);
    toast.success("✋ Hand raised — you're in the queue!");
    setTimeout(() => setIsRaisingHand(false), 2000);
  };

  const handleLowerHand = () => {
    socket?.emit("voice:raise-hand", { roomId, raise: false });
    setShowHand(false);
    toast.success("Hand lowered");
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: THEME.void }}
    >
      {/* Background Effects */}
      <StageParticles />
      <StageSpotlight isActive={speakers.length > 0} />

      {/* Top Bar - Glass Effect */}
      <header
        className="relative z-10 flex items-center justify-between px-6 py-4 border-b shrink-0 backdrop-blur-xl"
        style={{
          background: "rgba(10, 10, 18, 0.8)",
          borderColor: THEME.border,
        }}
      >
        <div className="flex items-center gap-4 min-w-0">
          {onLeave && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLeave}
              className="p-2 rounded-full transition-colors hover:bg-white/5 shrink-0"
              style={{ color: THEME.text.muted }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5"
                style={{
                  background:
                    speakers.length > 0
                      ? "rgba(110, 231, 183, 0.15)"
                      : THEME.border,
                  color:
                    speakers.length > 0 ? THEME.status.live : THEME.text.muted,
                }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${speakers.length > 0 ? "animate-pulse" : ""}`}
                  style={{
                    background:
                      speakers.length > 0
                        ? THEME.status.live
                        : THEME.text.muted,
                  }}
                />
                {speakers.length > 0 ? "Live" : "Quiet"}
              </span>
              <span
                className="text-[10px] font-mono"
                style={{ color: THEME.text.muted }}
              >
                {stage.name || "Main Stage"}
              </span>
              {isModerator && (
                <span
                  className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: "rgba(252, 211, 77, 0.15)",
                    color: "#FCD34D",
                  }}
                >
                  <ShieldCheck className="w-3 h-3" /> Moderator
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

        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border"
            style={{ color: THEME.text.muted, borderColor: THEME.border }}
          >
            <Users
              className="w-3.5 h-3.5"
              style={{ color: THEME.aurora.primary }}
            />
            <span style={{ color: THEME.aurora.primary }}>
              {speakers.length}
            </span>
            <span>/ 5</span>
            <span className="hidden sm:inline">speaking</span>
          </div>

          <div
            className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border"
            style={{ color: THEME.text.muted, borderColor: THEME.border }}
          >
            <Headphones className="w-3.5 h-3.5" />
            {listeners.length}
          </div>

          {raisedHandCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(252, 211, 77, 0.15)",
                color: "#FCD34D",
                border: "1px solid rgba(252, 211, 77, 0.2)",
              }}
            >
              <Hand className="w-3 h-3" />
              {raisedHandCount}
            </motion.div>
          )}
        </div>
      </header>

      {/* The Stage */}
      <section
        className="relative z-10 px-6 pt-12 pb-16 flex-1 overflow-y-auto"
        style={{
          minHeight: "300px",
        }}
      >
        {speakers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(167, 139, 250, 0.1)" }}
            >
              <Mic
                className="w-10 h-10"
                style={{ color: THEME.aurora.primary }}
              />
            </div>
            <h3
              className="text-2xl font-serif mb-2"
              style={{ color: THEME.text.primary }}
            >
              The Stage is Empty
            </h3>
            <p style={{ color: THEME.text.muted }}>
              {isModerator
                ? "Invite a listener up when you're ready."
                : "Waiting for a speaker to step up."}
            </p>
            {isModerator && listeners.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const firstListener =
                    listeners.find((l) => l.raisedHand) || listeners[0];
                  if (firstListener) handleAddToStage(firstListener.userId);
                }}
                disabled={isFull}
                className="mt-6 px-6 py-3 rounded-full font-semibold text-sm transition-all"
                style={{
                  background: `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
                  color: "#fff",
                }}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Invite First Speaker
              </motion.button>
            )}
          </motion.div>
        ) : (
          <LayoutGroup>
            <motion.div
              layout
              className="flex flex-wrap justify-center items-start gap-8 max-w-4xl mx-auto"
            >
              {speakers.map((userId) => {
                const participant = room.participants.find(
                  (p) => p.userId === userId,
                );
                if (!participant) return null;
                const isLive = !participant.isMuted;
                const isHost = participant.userId === room.creatorId;
                const isCurrentUser = participant.userId === user?.id;
                const canRemove = isModerator || isCurrentUser;

                return (
                  <SpeakerAvatar
                    key={userId}
                    name={participant.user.name}
                    isLive={isLive}
                    isHost={isHost}
                    isSpeaking={isLive}
                    size={96}
                    onRemove={
                      canRemove
                        ? () => handleRemoveFromStage(userId)
                        : undefined
                    }
                    canRemove={canRemove}
                    isPending={pendingUserId === userId}
                  />
                );
              })}

              {/* Full indicator */}
              {isFull && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 border-dashed text-center"
                  style={{ borderColor: THEME.border }}
                >
                  <span className="text-xs" style={{ color: THEME.text.muted }}>
                    Stage Full
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: THEME.text.muted }}
                  >
                    🎤 5/5
                  </span>
                </motion.div>
              )}
            </motion.div>
          </LayoutGroup>
        )}
      </section>

      {/* Divider */}
      <div className="relative z-10 px-6">
        <div
          className="h-px w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${THEME.aurora.primary}, transparent)`,
            opacity: 0.3,
          }}
        />
      </div>

      {/* Audience Section */}
      <section className="relative z-10 px-6 py-6 flex-1">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: THEME.text.muted }} />
            <h3 className="font-serif" style={{ color: THEME.text.primary }}>
              Audience
            </h3>
            <span
              className="text-xs font-mono"
              style={{ color: THEME.text.muted }}
            >
              ({listeners.length})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {raisedHandCount > 0 && (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: THEME.status.waiting }}
              >
                <Hand className="w-3.5 h-3.5" />
                {raisedHandCount} waiting
              </motion.div>
            )}

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audience..."
                className="px-3 py-1.5 rounded-full text-xs outline-none border transition-all focus:border-purple-500"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  borderColor: THEME.border,
                  color: THEME.text.primary,
                }}
              />
            </div>
          </div>
        </div>

        {listeners.length === 0 ? (
          <div className="text-center py-8">
            <p style={{ color: THEME.text.muted }}>
              No one in the audience yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredListeners.map((participant) => (
              <ListenerCard
                key={participant.id}
                participant={participant}
                isModerator={isModerator}
                isFull={isFull}
                isPending={pendingUserId === participant.userId}
                onAddToStage={() => handleAddToStage(participant.userId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sticky Action Bar - Glass Effect */}
      <footer
        className="relative z-10 px-6 py-4 border-t flex justify-center gap-3 shrink-0 backdrop-blur-xl flex-wrap"
        style={{
          background: "rgba(10, 10, 18, 0.8)",
          borderColor: THEME.border,
        }}
      >
        {!isSpeaker && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRaiseHand}
            disabled={isRaisingHand || showHand}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm transition-all disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
              color: "#fff",
              boxShadow: `0 0 40px ${THEME.aurora.primary}33`,
            }}
          >
            {isRaisingHand ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : showHand ? (
              <Check className="w-4 h-4" />
            ) : (
              <Hand className="w-4 h-4" />
            )}
            {showHand
              ? "Hand Raised ✋"
              : isRaisingHand
                ? "Raising..."
                : "Raise Hand"}
          </motion.button>
        )}

        {isSpeaker && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLowerHand}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm border transition-all"
            style={{
              borderColor: THEME.border,
              color: THEME.text.primary,
            }}
          >
            <X className="w-4 h-4" />
            Lower Hand
          </motion.button>
        )}

        {isModerator && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const waiting = listeners.filter((l) => l.raisedHand);
              if (waiting.length > 0 && !isFull) {
                handleAddToStage(waiting[0].userId);
              } else if (isFull) {
                toast.error("Stage is full");
              } else {
                toast.info("No one has raised their hand");
              }
            }}
            disabled={isFull}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm border transition-all disabled:opacity-40"
            style={{
              borderColor: THEME.aurora.primary,
              color: THEME.aurora.primary,
            }}
          >
            <UserPlus className="w-4 h-4" />
            Bring Next Up
          </motion.button>
        )}
      </footer>
    </div>
  );
};
