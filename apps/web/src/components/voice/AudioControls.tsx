import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  Volume1,
  Volume,
  VolumeOff,
  Headphones,
  HeadphoneOff,
  Shield,
  ShieldCheck,
  Radio,
  Waves,
  Zap,
  Sparkles,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  isConnecting?: boolean;
  connectionQuality?: "excellent" | "good" | "poor" | "disconnected";
  audioLevel?: number;
  isHost?: boolean;
  participantCount?: number;
  onShowParticipants?: () => void;
}

// ---- Theme Colors ----
const THEME = {
  void: "#0A0A12",
  surface: "#141425",
  surfaceRaised: "#1E1E38",
  border: "#2A2A4A",
  aurora: {
    primary: "#7C6AFF",
    secondary: "#A78BFA",
    tertiary: "#6EE7B7",
    quaternary: "#FCD34D",
    pink: "#F472B6",
    cyan: "#67E8F9",
  },
  text: {
    primary: "#F8F7FF",
    secondary: "#B8B0D8",
    muted: "#7A72A0",
  },
  status: {
    live: "#6EE7B7",
    liveGlow: "rgba(110, 231, 183, 0.3)",
    muted: "#7A72A0",
    danger: "#EF4444",
  },
};

// ---- Volume Slider Component ----
const VolumeSlider: React.FC<{
  value: number;
  onChange: (value: number) => void;
  isDeafened: boolean;
}> = ({ value, onChange, isDeafened }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);

  const getVolumeIcon = () => {
    if (isDeafened || value === 0) return <VolumeOff className="w-4 h-4" />;
    if (value < 30) return <Volume1 className="w-4 h-4" />;
    if (value < 70) return <Volume2 className="w-4 h-4" />;
    return <Volume className="w-4 h-4" />;
  };

  const getVolumeColor = () => {
    if (isDeafened || value === 0) return THEME.text.muted;
    if (value < 30) return THEME.aurora.cyan;
    if (value < 70) return THEME.aurora.tertiary;
    return THEME.aurora.primary;
  };

  return (
    <div
      className="flex items-center gap-2 relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <motion.div
        animate={{ color: getVolumeColor() }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/5 transition-colors"
      >
        {getVolumeIcon()}
      </motion.div>

      <div className="relative flex items-center h-8">
        <input
          ref={sliderRef}
          type="range"
          min="0"
          max="100"
          value={isDeafened ? 0 : value}
          onChange={(e) => {
            if (!isDeafened) {
              onChange(parseInt(e.target.value));
            }
          }}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          disabled={isDeafened}
          className="w-24 h-1 rounded-full appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, 
              ${getVolumeColor()} ${isDeafened ? 0 : value}%, 
              ${THEME.border} ${isDeafened ? 0 : value}%
            )`,
          }}
        />

        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && isDragging && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs font-mono"
              style={{
                background: THEME.surfaceRaised,
                color: THEME.text.primary,
                border: `1px solid ${THEME.border}`,
              }}
            >
              {isDeafened ? "Muted" : `${value}%`}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ---- Connection Quality Indicator ----
const ConnectionQuality: React.FC<{ quality: string }> = ({ quality }) => {
  const getQualityConfig = () => {
    switch (quality) {
      case "excellent":
        return { color: THEME.status.live, label: "Excellent", bars: 4 };
      case "good":
        return { color: THEME.aurora.tertiary, label: "Good", bars: 3 };
      case "poor":
        return { color: "#FBBF24", label: "Poor", bars: 2 };
      case "disconnected":
        return { color: THEME.status.danger, label: "Disconnected", bars: 0 };
      default:
        return { color: THEME.text.muted, label: "Connecting...", bars: 1 };
    }
  };

  const config = getQualityConfig();

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded-full"
      style={{ background: "rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center gap-0.5 h-4">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-1 rounded-full"
            style={{
              height: `${[4, 8, 12, 16][i]}px`,
              background: i < config.bars ? config.color : THEME.border,
              transition: "background 0.3s ease",
            }}
            animate={{
              opacity: i < config.bars ? 1 : 0.3,
            }}
          />
        ))}
      </div>
      <span
        className="text-[10px] font-mono"
        style={{ color: THEME.text.muted }}
      >
        {config.label}
      </span>
    </div>
  );
};

// ---- Main Component ----
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
  isConnecting = false,
  connectionQuality = "excellent",
  audioLevel = 0,
  isHost = false,
  participantCount = 0,
  onShowParticipants,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rippleEffect, setRippleEffect] = useState(false);

  // Audio level animation for mic
  const micPulse = audioLevel > 0.1 && !isMuted;

  const handleMuteToggle = () => {
    setRippleEffect(true);
    onToggleMute();
    setTimeout(() => setRippleEffect(false), 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Main Controls Container - Glass Effect */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl border"
        style={{
          background: "rgba(20, 20, 37, 0.8)",
          borderColor: THEME.border,
          boxShadow: isCallActive
            ? `0 0 40px ${THEME.aurora.primary}22`
            : "none",
        }}
      >
        {/* Mute Button with Audio Level Indicator */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMuteToggle}
          className="relative p-3 rounded-full transition-all"
          style={{
            background: isMuted
              ? "rgba(239, 68, 68, 0.15)"
              : `linear-gradient(135deg, ${THEME.aurora.primary}, ${THEME.aurora.secondary})`,
            boxShadow: isMuted ? "none" : `0 0 30px ${THEME.aurora.primary}33`,
          }}
        >
          {/* Ripple Effect */}
          <AnimatePresence>
            {rippleEffect && (
              <motion.span
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${THEME.aurora.primary}, transparent)`,
                }}
              />
            )}
          </AnimatePresence>

          {/* Audio Level Ring */}
          {micPulse && (
            <motion.div
              className="absolute inset-[-4px] rounded-full border-2"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ borderColor: THEME.aurora.primary }}
            />
          )}

          {isMuted ? (
            <MicOff className="w-5 h-5 text-red-400" />
          ) : (
            <Mic className="w-5 h-5 text-white" />
          )}

          {/* Mic indicator dot */}
          {!isMuted && (
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
              animate={{ scale: micPulse ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.5, repeat: micPulse ? Infinity : 0 }}
              style={{
                background: micPulse ? THEME.status.live : THEME.text.muted,
              }}
            />
          )}
        </motion.button>

        {/* Deafen Button */}
        {onToggleDeafen && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleDeafen}
            className={`p-3 rounded-full transition-all ${
              isDeafened
                ? "bg-red-500/10 hover:bg-red-500/20"
                : "hover:bg-white/5"
            }`}
            style={{
              color: isDeafened ? "#EF4444" : THEME.text.secondary,
            }}
          >
            {isDeafened ? (
              <HeadphoneOff className="w-5 h-5" />
            ) : (
              <Headphones className="w-5 h-5" />
            )}
          </motion.button>
        )}

        {/* Volume Slider */}
        {onVolumeChange && (
          <VolumeSlider
            value={volume}
            onChange={onVolumeChange}
            isDeafened={isDeafened}
          />
        )}

        {/* Separator */}
        <div className="w-px h-8" style={{ background: THEME.border }} />

        {/* Connection Quality */}
        <ConnectionQuality quality={connectionQuality} />

        {/* Participant Count */}
        {participantCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onShowParticipants}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all hover:bg-white/5"
            style={{ color: THEME.text.secondary }}
          >
            <span className="text-sm font-medium">{participantCount}</span>
            <span className="text-xs">👥</span>
          </motion.button>
        )}

        {/* Host Badge */}
        {isHost && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium"
            style={{
              background: "rgba(251, 191, 36, 0.15)",
              color: "#FBBF24",
            }}
          >
            <ShieldCheck className="w-3 h-3" />
            Host
          </div>
        )}

        {/* Call Actions */}
        {isCallIncoming && onAnswerCall && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAnswerCall}
            className="p-3 rounded-full transition-all"
            style={{
              background: `linear-gradient(135deg, ${THEME.aurora.tertiary}, ${THEME.aurora.cyan})`,
              boxShadow: `0 0 30px ${THEME.aurora.tertiary}33`,
            }}
          >
            <Phone className="w-5 h-5 text-white" />
          </motion.button>
        )}

        {isCallActive && onEndCall && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEndCall}
            className="p-3 rounded-full transition-all"
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <PhoneOff className="w-5 h-5 text-red-400" />
          </motion.button>
        )}

        {/* Connecting State */}
        {isConnecting && (
          <div className="flex items-center gap-2 px-2">
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: THEME.aurora.primary }}
            />
            <span className="text-xs" style={{ color: THEME.text.muted }}>
              Connecting...
            </span>
          </div>
        )}
      </div>

      {/* Bottom Glow Effect */}
      {isCallActive && (
        <motion.div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-8 rounded-full blur-xl"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: `radial-gradient(circle, ${THEME.aurora.primary}, transparent)`,
          }}
        />
      )}
    </motion.div>
  );
};

// ---- Mobile Optimized Version ----
export const MobileAudioControls: React.FC<AudioControlsProps> = (props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 p-4 backdrop-blur-xl border-t"
      style={{ background: "rgba(10, 10, 18, 0.9)", borderColor: THEME.border }}
    >
      <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
        <button
          onClick={props.onToggleMute}
          className={`p-4 rounded-full transition-all ${
            props.isMuted ? "bg-red-500/20" : "bg-purple-500/20"
          }`}
          style={{
            boxShadow: props.isMuted
              ? "none"
              : `0 0 40px ${THEME.aurora.primary}33`,
          }}
        >
          {props.isMuted ? (
            <MicOff className="w-6 h-6 text-red-400" />
          ) : (
            <Mic className="w-6 h-6 text-purple-400" />
          )}
        </button>

        {props.isCallActive && props.onEndCall && (
          <button
            onClick={props.onEndCall}
            className="p-4 rounded-full bg-red-500/20"
          >
            <PhoneOff className="w-6 h-6 text-red-400" />
          </button>
        )}

        {props.isCallIncoming && props.onAnswerCall && (
          <button
            onClick={props.onAnswerCall}
            className="p-4 rounded-full bg-green-500/20"
          >
            <Phone className="w-6 h-6 text-green-400" />
          </button>
        )}

        {/* Expand button for more controls */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3 rounded-full hover:bg-white/5"
          style={{ color: THEME.text.muted }}
        >
          <span className="text-sm">•••</span>
        </button>
      </div>

      {/* Expanded Controls */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-4 pt-3">
              {props.onToggleDeafen && (
                <button
                  onClick={props.onToggleDeafen}
                  className={`p-3 rounded-full ${
                    props.isDeafened ? "bg-red-500/20" : "hover:bg-white/5"
                  }`}
                  style={{
                    color: props.isDeafened ? "#EF4444" : THEME.text.secondary,
                  }}
                >
                  {props.isDeafened ? (
                    <HeadphoneOff className="w-5 h-5" />
                  ) : (
                    <Headphones className="w-5 h-5" />
                  )}
                </button>
              )}

              {props.onVolumeChange && (
                <div className="flex items-center gap-2">
                  <Volume2
                    className="w-4 h-4"
                    style={{ color: THEME.text.muted }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={props.isDeafened ? 0 : props.volume || 80}
                    onChange={(e) =>
                      !props.isDeafened &&
                      props.onVolumeChange?.(parseInt(e.target.value))
                    }
                    disabled={props.isDeafened}
                    className="w-32 h-1 rounded-full appearance-none cursor-pointer disabled:opacity-40"
                    style={{
                      background: `linear-gradient(to right, ${THEME.aurora.primary} ${props.isDeafened ? 0 : props.volume || 80}%, ${THEME.border} ${props.isDeafened ? 0 : props.volume || 80}%)`,
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---- Floating Controls (like Clubhouse) ----
export const FloatingAudioControls: React.FC<AudioControlsProps> = (props) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className="flex items-center gap-3 px-6 py-4 rounded-full backdrop-blur-2xl border shadow-2xl"
        style={{
          background: "rgba(10, 10, 18, 0.85)",
          borderColor: THEME.border,
          boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${THEME.aurora.primary}22`,
        }}
      >
        {/* Mute */}
        <button
          onClick={props.onToggleMute}
          className={`p-3 rounded-full transition-all ${
            props.isMuted ? "bg-red-500/20" : "bg-purple-500/20"
          }`}
          style={{
            boxShadow: props.isMuted
              ? "none"
              : `0 0 30px ${THEME.aurora.primary}33`,
          }}
        >
          {props.isMuted ? (
            <MicOff className="w-5 h-5 text-red-400" />
          ) : (
            <Mic className="w-5 h-5 text-purple-400" />
          )}
        </button>

        {/* Status */}
        <div className="flex flex-col items-center px-3">
          <span
            className="text-xs font-medium"
            style={{ color: THEME.text.primary }}
          >
            {props.isCallActive ? "🔴 Live" : "🎧 Listening"}
          </span>
          {props.participantCount !== undefined && (
            <span className="text-[10px]" style={{ color: THEME.text.muted }}>
              {props.participantCount} in room
            </span>
          )}
        </div>

        {/* Leave */}
        {props.onEndCall && (
          <button
            onClick={props.onEndCall}
            className="p-3 rounded-full hover:bg-red-500/20 transition-colors"
            style={{ color: "#EF4444" }}
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default AudioControls;
