import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { format } from "date-fns";
import type { Message } from "../../hooks/useChat";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import {
  Reply,
  Smile,
  Check,
  CornerDownRight,
  Play,
  Pause,
  Languages,
  Pencil,
  Pin,
  PinOff,
  CheckCheck,
  Music,
  File,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isPinned?: boolean;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: (pinned: boolean) => void;
  onReact?: (emoji: string) => void;
}

const commonEmojis = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🔥",
  "👏",
  "🎉",
  "🙏",
  "💯",
];
const WAVEFORM_BARS = 32;

function buildWaveform(seed: number): number[] {
  return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
    const t = (i + seed) / WAVEFORM_BARS;
    return 0.22 + 0.55 * Math.abs(Math.sin(t * Math.PI * 3.4 + seed * 0.7));
  });
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  isPinned = false,
  isSelected = false,
  isSelectionMode = false,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onReact,
}) => {
  const { user } = useAuth();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const waveform = useMemo(
    () => buildWaveform(message.id?.charCodeAt?.(0) || 1),
    [message.id],
  );

  const aggregatedReactions: Record<string, { count: number; mine: boolean }> =
    (message.reactions || []).reduce(
      (acc, r) => {
        if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
        acc[r.emoji].count += 1;
        if (r.userId === user?.id) acc[r.emoji].mine = true;
        return acc;
      },
      {} as Record<string, { count: number; mine: boolean }>,
    );

  const isVoiceNote = message.type === "VOICE_NOTE";
  const isSticker = message.type === "STICKER";
  const isImage = message.type === "IMAGE";
  const isVideo = message.type === "VIDEO";
  const isAudio = message.type === "AUDIO";
  const isGif = message.type === "GIF";

  const mediaSrc =
    message.mediaUrl ||
    (message as any).audioUrl ||
    message.fileUrl ||
    message.attachments?.[0]?.url ||
    "";

  const showVoicePlayer = (isVoiceNote || isAudio) && !!mediaSrc;
  const messageDuration = duration || (message as any).duration || 0;

  // Reset player UI when src changes — DO NOT revoke message blob URLs
  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
    setLoadError(false);
    setDuration(typeof (message as any).duration === "number" ? (message as any).duration : 0);
    setIsLoading(false);
  }, [mediaSrc, message]);

  // Wire audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !showVoicePlayer || !mediaSrc) return;

    const onTimeUpdate = () => {
      if (isDraggingRef.current) return;
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const onLoaded = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setLoadError(false);
        setIsLoading(false);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onError = () => {
      setLoadError(true);
      setIsPlaying(false);
      setIsLoading(false);
    };

    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => {
      setIsLoading(false);
      setLoadError(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    audio.addEventListener("waiting", onWaiting);

    if (audio.src !== mediaSrc) {
      audio.src = mediaSrc;
      audio.load();
    }
    audio.playbackRate = playbackRate;

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("waiting", onWaiting);
    };
  }, [mediaSrc, showVoicePlayer, playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !mediaSrc) {
      setLoadError(true);
      return;
    }

    if (loadError) {
      setLoadError(false);
      setIsLoading(true);
      audio.src = mediaSrc;
      audio.load();
      audio.play().catch(() => {
        setLoadError(true);
        setIsLoading(false);
      });
      return;
    }

    if (audio.paused) {
      audio.play().catch(() => setLoadError(true));
    } else {
      audio.pause();
    }
  }, [mediaSrc, loadError]);

  const cycleSpeed = useCallback(() => {
    setPlaybackRate((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2 : 1));
  }, []);

  const seekToClientX = useCallback(
    (clientX: number) => {
      const el = waveformRef.current;
      const audio = audioRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      setProgress(ratio);

      const d =
        audio && isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : messageDuration;
      if (audio && d > 0) audio.currentTime = ratio * d;
    },
    [messageDuration],
  );

  const onWaveformClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDraggingRef.current) return;
      seekToClientX(e.clientX);
    },
    [seekToClientX],
  );

  const onWaveformPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDraggingRef.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      seekToClientX(e.clientX);
    },
    [seekToClientX],
  );

  const onWaveformPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      seekToClientX(e.clientX);
    },
    [seekToClientX],
  );

  const onWaveformPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      seekToClientX(e.clientX);
    },
    [seekToClientX],
  );

  const formatTime = (sec: number) => {
    if (!sec || !isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const playedBars = Math.floor(progress * WAVEFORM_BARS);

  const MessageStatus = () => {
    if (!isOwn) return null;
    if (message.readReceipts && message.readReceipts.length > 0)
      return <CheckCheck className="w-3.5 h-3.5 text-sky-400" />;
    if (message.delivered)
      return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
    return <Check className="w-3.5 h-3.5 text-slate-400" />;
  };

  const messageTime = message.createdAt
    ? new Date(message.createdAt)
    : new Date();
  const timeStr = format(messageTime, "HH:mm");
  const relativeTime = useMemo(() => {
    const diff = Date.now() - messageTime.getTime();
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return format(messageTime, "MMM d");
  }, [messageTime]);

  const translation = message.translations?.[0] || null;
  const isAutoVoiceMessage =
    !message.content?.trim() ||
    message.content.trim().toLowerCase() === "voice message";

  return (
    <div
      className={`group relative flex items-end gap-2 my-1.5 ${
        isOwn ? "flex-row-reverse" : "flex-row"
      } ${isSelected ? "bg-indigo-50/60 rounded-2xl" : ""}`}
    >
      {!isSelectionMode && !isOwn && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border-2 border-white shadow-sm overflow-hidden">
          {message.sender?.avatarUrl ? (
            <img
              src={message.sender.avatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            message.sender?.name?.charAt(0).toUpperCase() || "U"
          )}
        </div>
      )}

      <div className="relative max-w-[80%] sm:max-w-[70%]">
        {isPinned && (
          <div
            className={`flex items-center gap-1 mb-1 ${isOwn ? "justify-end" : "justify-start"}`}
          >
            <Pin className="w-3 h-3 text-indigo-500" />
            <span className="text-[10px] font-semibold text-indigo-500">
              Pinned
            </span>
          </div>
        )}

        {!isSelectionMode && (
          <div
            className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 z-10 flex items-center gap-0.5 bg-white border border-slate-100 shadow-lg rounded-xl p-0.5 ${
              isOwn ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"
            }`}
          >
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onReply}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            {isOwn && (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPin?.(!isPinned)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                >
                  {isPinned ? (
                    <PinOff className="w-3.5 h-3.5" />
                  ) : (
                    <Pin className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              className={`absolute z-20 bottom-full mb-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-xl ${
                isOwn ? "right-0" : "left-0"
              }`}
            >
              <div className="grid grid-cols-5 gap-1">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact?.(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="hover:scale-125 p-1 rounded-lg text-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isSticker && mediaSrc ? (
          <img src={mediaSrc} alt="sticker" className="w-32 h-32 object-contain" />
        ) : isGif && mediaSrc ? (
          <img
            src={mediaSrc}
            alt="gif"
            className="w-full max-h-60 object-contain rounded-xl"
          />
        ) : (
          <div
            className={`p-3.5 rounded-3xl text-xs space-y-2 shadow-sm ${
              isOwn
                ? "bg-indigo-600 text-white rounded-br-md"
                : "bg-white text-slate-800 border border-slate-100 rounded-bl-md"
            }`}
          >
            {!isOwn && message.sender?.name && (
              <div className="font-bold text-[11px] text-indigo-600">
                {message.sender.name}
              </div>
            )}

            {message.replyTo && (
              <div
                className={`p-2 rounded-xl border-l-[3px] text-[11px] flex items-start gap-1.5 ${
                  isOwn
                    ? "bg-indigo-700/50 border-indigo-300 text-indigo-100"
                    : "bg-slate-50 border-indigo-500 text-slate-600"
                }`}
              >
                <CornerDownRight className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold block text-[10px] opacity-80">
                    {message.replyTo.sender?.name}
                  </span>
                  <p className="truncate font-medium">
                    {message.replyTo.content || "Media message"}
                  </p>
                </div>
              </div>
            )}

            {showVoicePlayer ? (
              <div
                className={`flex items-center gap-2.5 min-w-[220px] max-w-[300px] p-2.5 rounded-2xl ${
                  isOwn ? "bg-indigo-700/55" : "bg-slate-100"
                }`}
              >
                <audio ref={audioRef} preload="metadata" playsInline />

                <button
                  type="button"
                  onClick={togglePlay}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isOwn
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "bg-indigo-600 text-white shadow-sm"
                  }`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4" fill="currentColor" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                  )}
                </button>

                <div className="flex-1 min-w-0 space-y-1">
                  <div
                    ref={waveformRef}
                    className="flex items-center gap-[2px] h-7 cursor-pointer select-none touch-none"
                    onClick={onWaveformClick}
                    onPointerDown={onWaveformPointerDown}
                    onPointerMove={onWaveformPointerMove}
                    onPointerUp={onWaveformPointerUp}
                    onPointerCancel={onWaveformPointerUp}
                  >
                    {waveform.map((level, i) => (
                      <div
                        key={i}
                        className={`flex-1 min-w-[2px] max-w-[4px] rounded-full pointer-events-none ${
                          i < playedBars
                            ? isOwn
                              ? "bg-white"
                              : "bg-indigo-500"
                            : isOwn
                              ? "bg-indigo-400/40"
                              : "bg-slate-300"
                        }`}
                        style={{ height: `${Math.round(level * 100)}%` }}
                      />
                    ))}
                  </div>
                  <div
                    className={`flex justify-between text-[10px] font-medium tabular-nums ${
                      isOwn ? "text-indigo-200/90" : "text-slate-500"
                    }`}
                  >
                    <span>{formatTime(progress * messageDuration)}</span>
                    <span>{formatTime(messageDuration)}</span>
                  </div>
                  {loadError && (
                    <div className="flex items-center gap-2 text-[10px] text-red-300">
                      <AlertCircle className="w-3 h-3" />
                      <span>Audio unavailable</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLoadError(false);
                          setIsLoading(true);
                          if (audioRef.current) {
                            audioRef.current.src = mediaSrc;
                            audioRef.current.load();
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 hover:bg-red-500/30 rounded-full"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={cycleSpeed}
                  className={`shrink-0 min-w-[36px] h-7 px-1.5 rounded-lg text-[11px] font-bold tabular-nums ${
                    isOwn
                      ? "bg-indigo-900/40 text-white"
                      : "bg-white text-indigo-600 border border-slate-200"
                  }`}
                >
                  {playbackRate === 1.5 ? "1.5x" : `${playbackRate}x`}
                </button>
              </div>
            ) : (isVoiceNote || isAudio) && !mediaSrc ? (
              <div
                className={`flex items-center gap-2 text-[11px] ${
                  isOwn ? "text-indigo-200" : "text-slate-500"
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                Voice message (no file)
              </div>
            ) : null}

            {isImage && mediaSrc && (
              <img
                src={mediaSrc}
                alt=""
                className="w-full max-h-60 object-cover rounded-xl cursor-pointer"
                onClick={() => setShowFullImage(true)}
                loading="lazy"
              />
            )}

            {isVideo && mediaSrc && (
              <video
                src={mediaSrc}
                controls
                className="w-full max-h-60 rounded-xl"
                poster={(message as any).thumbnailUrl}
                playsInline
              />
            )}

            {message.fileUrl &&
              !isVoiceNote &&
              !isAudio &&
              !isImage &&
              !isVideo &&
              !isGif && (
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`p-2.5 rounded-xl flex items-center gap-2 border text-xs font-semibold ${
                    isOwn
                      ? "bg-indigo-700/50 border-indigo-500 text-indigo-100"
                      : "bg-slate-50 border-slate-200 text-indigo-600"
                  }`}
                >
                  <File className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {(message as any).fileName || "View file"}
                  </span>
                </a>
              )}

            {message.content &&
              !(showVoicePlayer && isAutoVoiceMessage) &&
              !(isImage || isVideo || isGif) && (
                <div className="leading-relaxed font-medium whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}

            {translation && (
              <button
                type="button"
                onClick={() => setShowTranslation((v) => !v)}
                className={`flex items-center gap-1 text-[10px] font-semibold ${
                  isOwn ? "text-indigo-300" : "text-indigo-500"
                } hover:underline`}
              >
                <Languages className="w-3 h-3" />
                {showTranslation ? "Hide translation" : "See translation"}
              </button>
            )}
            {showTranslation && translation && (
              <div
                className={`text-[11px] italic pt-1 border-t ${
                  isOwn
                    ? "border-indigo-700 text-indigo-200"
                    : "border-slate-100 text-slate-500"
                }`}
              >
                {translation.translatedContent}
              </div>
            )}

            <div
              className={`flex items-center justify-end gap-1.5 text-[10px] font-semibold mt-0.5 ${
                isOwn ? "text-indigo-200/80" : "text-slate-400"
              }`}
            >
              {message.isEdited && (
                <span className="flex items-center gap-0.5 opacity-80">
                  <Pencil className="w-2.5 h-2.5" />
                  edited
                </span>
              )}
              <span title={format(messageTime, "PPpp")}>{timeStr}</span>
              <span className="text-[9px] opacity-0 group-hover:opacity-70">
                {relativeTime}
              </span>
              {isOwn && <MessageStatus />}
            </div>
          </div>
        )}

        {Object.keys(aggregatedReactions).length > 0 && (
          <div
            className={`flex items-center gap-1 mt-1.5 flex-wrap ${
              isOwn ? "justify-end" : "justify-start"
            }`}
          >
            {Object.entries(aggregatedReactions).map(
              ([emoji, { count, mine }]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact?.(emoji)}
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border shadow-sm text-[11px] font-bold ${
                    mine
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && (
                    <span
                      className={`text-[10px] ${
                        mine ? "text-indigo-400" : "text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showFullImage && mediaSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={mediaSrc}
                alt=""
                className="w-full h-full object-contain rounded-2xl"
              />
              <button
                type="button"
                onClick={() => setShowFullImage(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};