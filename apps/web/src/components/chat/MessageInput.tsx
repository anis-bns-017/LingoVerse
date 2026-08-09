import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  Smile,
  X,
  Loader2,
  Mic,
  MicOff,
  Check,
  Edit,
  File,
  Video,
  Music,
  AtSign,
  MapPin,
  Circle,
  CircleCheck,
  Clock,
  Play,
  Pause,
  Trash2,
} from "lucide-react";

interface MessageInputProps {
  onSend: (
    content: string,
    type?: string,
    mediaUrl?: string,
    fileUrl?: string,
  ) => void;
  onTyping?: (isTyping: boolean) => void;
  /** Called when user finishes a voice note and hits send */
  onVoiceRecording?: (blob: Blob, duration: number) => void;
  editingMessage?: { id: string; content: string } | null;
  onCancelEdit?: () => void;
  isConnected?: boolean;
  onEmojiPickerToggle?: () => void;
  onSelectMessages?: () => void;
  isSelectionMode?: boolean;
  // Optional – ignored if recording is owned here (kept for backward compat)
  isRecording?: boolean;
  recordingDuration?: number;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  onVoiceRecording,
  editingMessage = null,
  onCancelEdit,
  isConnected = true,
  onEmojiPickerToggle,
  onSelectMessages,
  isSelectionMode = false,
}) => {
  const [content, setContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: "image" | "video" | "audio" | "file";
    name?: string;
  } | null>(null);
  const [fileAttachment, setFileAttachment] = useState<{
    name: string;
    url: string;
    size?: number;
    type?: string;
  } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isTypingState, setIsTypingState] = useState(false);

  // Recording (owned by this component)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingDurationRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Recording ───────────────────────────────────────────────────────────
  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const mediaRecorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        clearRecordingTimer();
        stopTracks();

        const blob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        const durationSec = recordingDurationRef.current;

        setRecordingBlob(blob);
        setRecordingDuration(0);
        recordingDurationRef.current = 0;
        setIsRecording(false);

        const url = URL.createObjectURL(blob);
        setPreviewAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });

        setMediaPreview({
          url,
          type: "audio",
          name: "Voice message",
        });

        // Prefer duration from audio metadata when available
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
          if (isFinite(audio.duration) && audio.duration > 0) {
            setAudioDuration(audio.duration);
          } else {
            setAudioDuration(durationSec);
          }
        };
        audio.onerror = () => setAudioDuration(durationSec);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
      setRecordingBlob(null);
      setAudioProgress(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => {
          const next = d + 1;
          recordingDurationRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      alert(
        "Unable to access microphone. Please allow microphone permissions.",
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      clearRecordingTimer();
      stopTracks();
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const discardRecording = useCallback(() => {
    if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    setPreviewAudioUrl(null);
    setRecordingBlob(null);
    setMediaPreview(null);
    setAudioDuration(0);
    setAudioProgress(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [previewAudioUrl]);

  // ─── Preview playback ────────────────────────────────────────────────────
  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !previewAudioUrl) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [previewAudioUrl]);

  const handleAudioTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setAudioProgress((audio.currentTime / audio.duration) * 100);
  }, []);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setAudioProgress(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, []);

  const handleAudioSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio || !audioDuration) return;
      const pct = parseFloat(e.target.value);
      audio.currentTime = (pct / 100) * audioDuration;
      setAudioProgress(pct);
    },
    [audioDuration],
  );

  // ─── Edit / typing / send ────────────────────────────────────────────────
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || "");
      setMediaPreview(null);
      setFileAttachment(null);
      setShowAttachmentMenu(false);
      setShowEmojiPicker(false);
      discardRecording();
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        const len = editingMessage.content?.length || 0;
        textareaRef.current?.setSelectionRange(len, len);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage?.id]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120,
      )}px`;
    }
  }, [content]);

  const stopTyping = useCallback(() => {
    if (isTypingState) {
      setIsTypingState(false);
      onTyping?.(false);
    }
  }, [isTypingState, onTyping]);

  const handleTyping = useCallback(
    (value: string) => {
      setContent(value);
      if (value.trim().length > 0) {
        if (!isTypingState) {
          setIsTypingState(true);
          onTyping?.(true);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => stopTyping(), 2000);
      } else {
        stopTyping();
      }
    },
    [isTypingState, onTyping, stopTyping],
  );

  const handleCancelEdit = useCallback(() => {
    setContent("");
    setMediaPreview(null);
    setFileAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onCancelEdit?.();
  }, [onCancelEdit]);

  const handleSend = useCallback(() => {
    // Voice note ready to send
    if (recordingBlob && mediaPreview?.type === "audio") {
      const dur = Math.max(
        1,
        Math.floor(audioDuration || recordingDurationRef.current || 0),
      );
      onVoiceRecording?.(recordingBlob, dur);
      discardRecording();
      setContent("");
      setFileAttachment(null);
      setShowAttachmentMenu(false);
      setShowEmojiPicker(false);
      stopTyping();
      return;
    }

    if (!content.trim() && !mediaPreview && !fileAttachment) return;

    let messageType = "TEXT";
    let mediaUrl = mediaPreview?.url;
    let fileUrl = fileAttachment?.url;

    if (mediaPreview) {
      messageType =
        mediaPreview.type === "video"
          ? "VIDEO"
          : mediaPreview.type === "audio"
            ? "AUDIO"
            : "IMAGE";
    } else if (fileAttachment) {
      messageType = "FILE";
    }

    onSend(content.trim(), messageType, mediaUrl, fileUrl);

    setContent("");
    setMediaPreview(null);
    setFileAttachment(null);
    setShowAttachmentMenu(false);
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    stopTyping();
  }, [
    content,
    mediaPreview,
    fileAttachment,
    recordingBlob,
    audioDuration,
    onSend,
    onVoiceRecording,
    discardRecording,
    stopTyping,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "Escape" && editingMessage) handleCancelEdit();
    },
    [handleSend, editingMessage, handleCancelEdit],
  );

  const handleFileUpload = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      type: "image" | "video" | "audio" | "file",
    ) => {
      if (editingMessage) return;
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) {
        alert("File size exceeds 50MB limit");
        return;
      }
      setIsUploading(true);
      const url = URL.createObjectURL(file);
      if (type === "image") setMediaPreview({ url, type: "image" });
      else if (type === "video")
        setMediaPreview({ url, type: "video", name: file.name });
      else if (type === "audio")
        setMediaPreview({ url, type: "audio", name: file.name });
      else
        setFileAttachment({
          name: file.name,
          url,
          size: file.size,
          type: file.type,
        });
      setIsUploading(false);
      setShowAttachmentMenu(false);
    },
    [editingMessage],
  );

  const removeAttachment = useCallback(() => {
    if (mediaPreview?.type === "audio" && recordingBlob) {
      discardRecording();
    } else {
      if (mediaPreview?.url) URL.revokeObjectURL(mediaPreview.url);
      setMediaPreview(null);
    }
    setFileAttachment(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [discardRecording, mediaPreview, recordingBlob]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDuration = (seconds: number) => {
    const s = Math.floor(seconds || 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      clearRecordingTimer();
      stopTracks();
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEditMode = !!editingMessage;
  const canSend =
    (content.trim() || mediaPreview || fileAttachment || recordingBlob) &&
    !isUploading &&
    !isRecording &&
    !isSelectionMode;

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, "image")}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, "video")}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, "audio")}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
        className="hidden"
        onChange={(e) => handleFileUpload(e, "file")}
      />

      {previewAudioUrl && (
        <audio
          ref={audioRef}
          src={previewAudioUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="hidden"
          preload="metadata"
        />
      )}

      {!isConnected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs text-amber-700 font-medium">
            Reconnecting… Messages will send when connected
          </span>
        </div>
      )}

      {(mediaPreview || fileAttachment || isUploading) && !isEditMode && (
        <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
          {isUploading ? (
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold px-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading…
            </div>
          ) : mediaPreview?.type === "audio" ? (
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center text-indigo-600 shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={audioProgress}
                  onChange={handleAudioSeek}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-xs font-mono text-slate-600 min-w-[40px]">
                  {formatDuration(
                    audioDuration || recordingDurationRef.current,
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={discardRecording}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : mediaPreview?.type === "image" ? (
            <div className="relative">
              <img
                src={mediaPreview.url}
                alt=""
                className="w-14 h-14 object-cover rounded-xl border border-slate-200"
              />
              <button
                type="button"
                onClick={removeAttachment}
                className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : mediaPreview?.type === "video" ? (
            <div className="relative w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
              <button
                type="button"
                onClick={removeAttachment}
                className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          {fileAttachment && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 max-w-[200px]">
              <File className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{fileAttachment.name}</span>
              {fileAttachment.size != null && (
                <span className="text-[10px] text-slate-400">
                  {formatFileSize(fileAttachment.size)}
                </span>
              )}
              <button
                type="button"
                onClick={removeAttachment}
                className="text-slate-400 hover:text-rose-600 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {showAttachmentMenu && !isEditMode && (
        <div className="flex flex-wrap gap-1 p-2 bg-white border border-slate-200 rounded-xl shadow-lg">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600"
          >
            <ImageIcon className="w-4 h-4 text-blue-500" /> Image
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600"
          >
            <Video className="w-4 h-4 text-red-500" /> Video
          </button>
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600"
          >
            <Music className="w-4 h-4 text-purple-500" /> Audio
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600"
          >
            <File className="w-4 h-4 text-orange-500" /> Document
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  onSend(
                    `📍 Location: ${pos.coords.latitude}, ${pos.coords.longitude}`,
                    "LOCATION",
                  );
                  setShowAttachmentMenu(false);
                },
                () => alert("Unable to get location."),
              );
            }}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600"
          >
            <MapPin className="w-4 h-4 text-emerald-500" /> Location
          </button>
          <button
            type="button"
            onClick={() => {
              onSend("📇 Contact shared", "CONTACT");
              setShowAttachmentMenu(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600"
          >
            <AtSign className="w-4 h-4 text-indigo-500" /> Contact
          </button>
        </div>
      )}

      <div
        className={`flex items-end gap-2 bg-white border p-2 rounded-2xl shadow-sm transition-all ${
          isEditMode
            ? "border-amber-400 ring-2 ring-amber-400/20"
            : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20"
        }`}
      >
        <div className="flex items-center gap-0.5 pb-1">
          {!isEditMode && (
            <>
              <button
                type="button"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl"
                title="Attach"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  onEmojiPickerToggle?.();
                }}
                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-100 rounded-xl"
                title="Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </>
          )}
          {isEditMode && (
            <div className="flex items-center gap-1.5 px-2 text-amber-600">
              <Edit className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">Editing</span>
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isEditMode
              ? "Edit your message… (Esc to cancel)"
              : isRecording
                ? "Recording…"
                : isSelectionMode
                  ? "Select messages…"
                  : "Type a message… (Shift + Enter for new line)"
          }
          rows={1}
          disabled={isRecording || isSelectionMode}
          className="flex-1 bg-transparent py-1.5 px-1 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-32"
        />

        <div className="flex items-center gap-0.5 pb-1">
          {isEditMode && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {!isEditMode && (
            <button
              type="button"
              onClick={toggleRecording}
              className={`p-2 rounded-xl ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
              }`}
              title={isRecording ? "Stop recording" : "Record voice message"}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          )}

          {isRecording && (
            <span className="text-xs font-mono text-red-500 font-bold min-w-[40px]">
              {formatDuration(recordingDuration)}
            </span>
          )}

          {!isEditMode && (
            <button
              type="button"
              onClick={onSelectMessages}
              className={`p-2 rounded-xl ${
                isSelectionMode
                  ? "bg-indigo-100 text-indigo-600"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
              }`}
              title="Select"
            >
              {isSelectionMode ? (
                <CircleCheck className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`p-2.5 rounded-xl shrink-0 ${
              !canSend
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : isEditMode
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
            title={isEditMode ? "Save" : "Send"}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isEditMode ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {showEmojiPicker && !isEditMode && (
        <div className="flex flex-wrap gap-1 p-2 bg-white border border-slate-200 rounded-xl shadow-lg">
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
          ].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setContent((prev) => prev + emoji);
                setShowEmojiPicker(false);
                textareaRef.current?.focus();
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
