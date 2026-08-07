import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Mic, 
  Volume2, 
  VolumeX, 
  Download, 
  Trash2,
  Share2,
  Clock,
  Loader2,
  SkipForward,
  SkipBack,
  Repeat,
  RepeatOnce,
  Maximize2,
  Minimize2,
  Info,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';

interface VoiceMessageProps {
  audioUrl: string;
  duration?: number;
  isOwn?: boolean;
  timestamp?: string | Date;
  senderName?: string;
  senderAvatar?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  isDownloading?: boolean;
  isPlaying?: boolean;
  isPinned?: boolean;
  showWaveform?: boolean;
  waveformData?: number[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'expanded';
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Default waveform bars (48 bars for better visual)
const DEFAULT_WAVEFORM = Array.from({ length: 48 }, () => 
  Math.floor(Math.random() * 80 + 20)
);

export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  audioUrl,
  duration = 0,
  isOwn = false,
  timestamp,
  senderName,
  senderAvatar,
  onPlay,
  onPause,
  onComplete,
  onDelete,
  onShare,
  onDownload,
  isDownloading = false,
  isPlaying: externalIsPlaying,
  isPinned = false,
  showWaveform = true,
  waveformData = DEFAULT_WAVEFORM,
  className = '',
  size = 'md',
  variant = 'default',
}) => {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(duration);
  const [speedIndex, setSpeedIndex] = useState(2); // Default 1x
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWaveformIndex, setCurrentWaveformIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();

  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'w-8 h-8',
      icon: 'w-4 h-4',
      padding: 'p-2',
      text: 'text-xs',
      gap: 'gap-1.5',
    },
    md: {
      button: 'w-10 h-10',
      icon: 'w-5 h-5',
      padding: 'p-3',
      text: 'text-sm',
      gap: 'gap-2.5',
    },
    lg: {
      button: 'w-12 h-12',
      icon: 'w-6 h-6',
      padding: 'p-4',
      text: 'text-base',
      gap: 'gap-3',
    },
  };

  const config = sizeConfig[size];

  // Sync state with audio element events
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && !isSeeking) {
      setCurrentTime(audioRef.current.currentTime);
      
      // Update waveform progress
      const progress = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * waveformData.length;
      setCurrentWaveformIndex(Math.floor(progress));
    }
  }, [isSeeking, waveformData.length]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const duration = audioRef.current.duration;
      if (!isNaN(duration) && duration > 0) {
        setMediaDuration(duration);
        setIsLoading(false);
        setError(null);
      }
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (isLooping) {
      audioRef.current?.play();
      return;
    }
    setInternalIsPlaying(false);
    setCurrentTime(0);
    setCurrentWaveformIndex(0);
    onPause?.();
    onComplete?.();
  }, [isLooping, onPause, onComplete]);

  const handleError = useCallback(() => {
    setError('Failed to load audio');
    setIsLoading(false);
    setInternalIsPlaying(false);
  }, []);

  // Toggle playback
  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return;
    
    if (error) {
      setError(null);
      audioRef.current.load();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setInternalIsPlaying(false);
      onPause?.();
    } else {
      try {
        await audioRef.current.play();
        setInternalIsPlaying(true);
        onPlay?.();
        setError(null);
      } catch (err) {
        setError('Unable to play audio');
        setInternalIsPlaying(false);
      }
    }
  }, [isPlaying, onPlay, onPause, error]);

  // Change playback speed
  const cyclePlaybackSpeed = useCallback(() => {
    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    if (audioRef.current) {
      audioRef.current.playbackRate = PLAYBACK_SPEEDS[nextIndex];
    }
  }, [speedIndex]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Change volume
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      if (newVolume === 0) {
        audioRef.current.muted = true;
        setIsMuted(true);
      } else if (isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  }, [isMuted]);

  // Toggle loop
  const toggleLoop = useCallback(() => {
    setIsLooping(!isLooping);
    if (audioRef.current) {
      audioRef.current.loop = !isLooping;
    }
  }, [isLooping]);

  // Seek to position
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || !audioRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const effectiveDuration = mediaDuration || duration || audioRef.current.duration || 0;

    if (effectiveDuration > 0) {
      const newTime = Math.min(Math.max((clickX / width) * effectiveDuration, 0), effectiveDuration);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      
      // Update waveform progress
      const progress = (newTime / effectiveDuration) * waveformData.length;
      setCurrentWaveformIndex(Math.floor(progress));
    }
  }, [mediaDuration, duration, waveformData.length]);

  // Seek with keyboard
  const handleKeySeek = useCallback((direction: 'forward' | 'backward') => {
    if (!audioRef.current) return;
    const skipTime = 5; // Skip 5 seconds
    const newTime = direction === 'forward' 
      ? Math.min(audioRef.current.currentTime + skipTime, audioRef.current.duration || 0)
      : Math.max(audioRef.current.currentTime - skipTime, 0);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // Format time
  const formatTime = useCallback((seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  // Get remaining time
  const remainingTime = useMemo(() => {
    const duration = mediaDuration || duration || 0;
    return Math.max(duration - currentTime, 0);
  }, [mediaDuration, duration, currentTime]);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !showWaveform) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / waveformData.length;
    const progress = currentWaveformIndex / waveformData.length;

    ctx.clearRect(0, 0, width, height);

    waveformData.forEach((heightPercent, index) => {
      const x = index * barWidth;
      const barHeight = (heightPercent / 100) * height;
      const y = (height - barHeight) / 2;
      const isPlayed = index <= currentWaveformIndex;

      // Gradient for played portion
      if (isPlayed) {
        const gradient = ctx.createLinearGradient(0, y, 0, height);
        if (isOwn) {
          gradient.addColorStop(0, '#93C5FD');
          gradient.addColorStop(1, '#60A5FA');
        } else {
          gradient.addColorStop(0, '#818CF8');
          gradient.addColorStop(1, '#6366F1');
        }
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(156,163,175,0.3)';
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth - 1, barHeight, 2);
      ctx.fill();

      // Glow effect on current position
      if (index === currentWaveformIndex) {
        ctx.shadowColor = isOwn ? 'rgba(255,255,255,0.5)' : 'rgba(99,102,241,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = isOwn ? 'rgba(255,255,255,0.8)' : 'rgba(99,102,241,0.8)';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - 1, barHeight, 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }, [waveformData, currentWaveformIndex, isOwn, showWaveform]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Load audio on URL change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      setIsLoading(true);
      setCurrentTime(0);
      setCurrentWaveformIndex(0);
    }
  }, [audioUrl]);

  const effectiveDuration = mediaDuration || duration || 0;
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  // Variant styles
  const variantStyles = {
    default: {
      container: `${isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} shadow-sm`,
      button: isOwn ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700',
      played: isOwn ? 'bg-white' : 'bg-blue-600',
      unplayed: isOwn ? 'bg-blue-400/50' : 'bg-gray-300',
      text: isOwn ? 'text-blue-100' : 'text-gray-500',
    },
    minimal: {
      container: 'bg-transparent border border-gray-200 text-gray-800',
      button: 'bg-blue-600 text-white hover:bg-blue-700',
      played: 'bg-blue-600',
      unplayed: 'bg-gray-300',
      text: 'text-gray-500',
    },
    expanded: {
      container: `bg-gradient-to-r ${isOwn ? 'from-blue-600 to-blue-700' : 'from-gray-100 to-gray-200'} text-gray-800 shadow-lg`,
      button: isOwn ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700',
      played: isOwn ? 'bg-white' : 'bg-blue-600',
      unplayed: isOwn ? 'bg-blue-400/50' : 'bg-gray-300',
      text: isOwn ? 'text-blue-100' : 'text-gray-500',
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex flex-col rounded-2xl ${config.padding} ${styles.container} w-full max-w-[400px] ${className}`}
    >
      {/* Main controls */}
      <div className="flex items-center gap-3">
        {/* Avatar (if sender info provided) */}
        {senderName && !isOwn && variant !== 'minimal' && (
          <div className="flex-shrink-0">
            {senderAvatar ? (
              <img 
                src={senderAvatar} 
                alt={senderName}
                className="w-8 h-8 rounded-full object-cover border-2 border-white"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold">
                {senderName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Sender name */}
          {senderName && !isOwn && variant !== 'minimal' && (
            <div className="text-xs font-semibold mb-1 truncate">
              {senderName}
            </div>
          )}

          {/* Audio player */}
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onError={handleError}
            preload="metadata"
            className="hidden"
          />

          {/* Waveform track */}
          <div className="flex items-center gap-2">
            {/* Play/Pause button */}
            <motion.button
              type="button"
              onClick={togglePlay}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading}
              className={`${config.button} rounded-full flex items-center justify-center flex-shrink-0 transition-all ${styles.button} ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
            >
              {isLoading ? (
                <Loader2 className={`${config.icon} animate-spin`} />
              ) : isPlaying ? (
                <Pause className={`${config.icon} fill-current`} />
              ) : (
                <Play className={`${config.icon} fill-current ml-0.5`} />
              )}
            </motion.button>

            {/* Waveform track */}
            {showWaveform ? (
              <div
                ref={trackRef}
                onClick={handleSeek}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="relative flex-1 cursor-pointer group py-1"
              >
                <canvas
                  ref={waveformCanvasRef}
                  width={waveformData.length * 4}
                  height={32}
                  className="w-full h-8 rounded-lg"
                />
                
                {/* Progress tooltip */}
                <AnimatePresence>
                  {showTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded"
                    >
                      {formatTime(currentTime)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              {/* Simple progress bar */}
              <div
                ref={trackRef}
                onClick={handleSeek}
                className="flex-1 h-1.5 bg-gray-300 rounded-full cursor-pointer relative group"
              >
                <div
                  ref={progressRef}
                  className={`h-full rounded-full transition-all ${
                    isOwn ? 'bg-white' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                    isOwn ? 'bg-white' : 'bg-blue-600'
                  }`}
                  style={{ left: `calc(${progressPercent}% - 6px)` }}
                />
              </div>
            )}
          </div>

          {/* Time and controls */}
          <div className={`flex items-center justify-between mt-1.5 ${config.text} font-mono leading-none`}>
            <div className="flex items-center gap-2">
              <span className={styles.text}>
                {isPlaying ? formatTime(currentTime) : formatTime(effectiveDuration)}
              </span>
              {isPlaying && (
                <span className={`text-[10px] ${styles.text} opacity-75`}>
                  -{formatTime(remainingTime)}
                </span>
              )}
              {timestamp && (
                <span className={`text-[10px] ${styles.text} opacity-50 hidden sm:inline`}>
                  · {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Speed control */}
              <motion.button
                type="button"
                onClick={cyclePlaybackSpeed}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  isOwn
                    ? 'bg-blue-500/50 text-white hover:bg-blue-400/50'
                    : 'bg-gray-200/70 text-gray-700 hover:bg-gray-300/70'
                }`}
                title="Playback speed"
              >
                {PLAYBACK_SPEEDS[speedIndex]}x
              </motion.button>

              {/* Loop control */}
              <motion.button
                type="button"
                onClick={toggleLoop}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`p-0.5 rounded transition-colors ${isLooping ? 'text-indigo-500' : styles.text}`}
                title={isLooping ? 'Loop off' : 'Loop on'}
              >
                {isLooping ? (
                  <RepeatOnce className="w-3.5 h-3.5" />
                ) : (
                  <Repeat className="w-3.5 h-3.5" />
                )}
              </motion.button>

              {/* Volume control - expanded variant only */}
              {variant === 'expanded' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`p-0.5 rounded transition-colors ${styles.text}`}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-12 h-1 bg-gray-300 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              )}

              {/* Skip buttons */}
              {(variant === 'expanded' || isPlaying) && (
                <>
                  <button
                    type="button"
                    onClick={() => handleKeySeek('backward')}
                    className={`p-0.5 rounded transition-colors ${styles.text} hover:bg-white/20`}
                    title="Skip backward 5s"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeySeek('forward')}
                    className={`p-0.5 rounded transition-colors ${styles.text} hover:bg-white/20`}
                    title="Skip forward 5s"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions bar - expanded variant */}
      {variant === 'expanded' && (
        <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-white/10">
          {onDownload && (
            <button
              onClick={onDownload}
              disabled={isDownloading}
              className={`p-1.5 rounded-lg transition-colors ${styles.text} hover:bg-white/10 disabled:opacity-50`}
              title="Download"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className={`p-1.5 rounded-lg transition-colors ${styles.text} hover:bg-white/10`}
              title="Share"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && isOwn && (
            <button
              onClick={onDelete}
              className={`p-1.5 rounded-lg transition-colors text-red-400 hover:bg-red-500/20`}
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-lg transition-colors ${styles.text} hover:bg-white/10`}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-red-400 mt-1 flex items-center gap-1"
        >
          <Info className="w-3 h-3" />
          {error}
          <button
            onClick={() => {
              setError(null);
              audioRef.current?.load();
            }}
            className="text-blue-400 hover:underline"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* Pinned indicator */}
      {isPinned && (
        <div className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">
          📌
        </div>
      )}
    </motion.div>
  );
};

// Canvas roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (r > w/2) r = w/2;
    if (r > h/2) r = h/2;
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    return this;
  };
}