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
import { toast } from "sonner";

interface MessageInputProps {
  onSend: (
    content: string,
    type?: string,
    mediaUrl?: string,
    fileUrl?: string,
  ) => void;
  onTyping?: (isTyping: boolean) => void;
  onVoiceRecording?: (blob: Blob, duration: number) => void;
  editingMessage?: { id: string; content: string } | null;
  onCancelEdit?: () => void;
  isConnected?: boolean;
  onEmojiPickerToggle?: () => void;
  onSelectMessages?: () => void;
  isSelectionMode?: boolean;
  isRecording?: boolean;
  recordingDuration?: number;
}

const BAR_COUNT = 32;

// ✅ Cloudinary upload preset - you need to create this in Cloudinary dashboard
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ; // Create this in Cloudinary
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME; // Replace with your cloud name

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

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(
    Array(BAR_COUNT).fill(0.08),
  );
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);

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

  // Visualizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const smoothLevelsRef = useRef<number[]>(Array(BAR_COUNT).fill(0.08));

  const getSupportedMimeType = () => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const type of types) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(type)
      ) {
        return type;
      }
    }
    return "";
  };

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

  // ─── Live spectrum (while recording) ─────────────────────────────────────
  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    smoothLevelsRef.current = Array(BAR_COUNT).fill(0.08);
    setAudioLevels(Array(BAR_COUNT).fill(0.08));
  }, []);

  const startVisualizer = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const usable = Math.floor(data.length * 0.5);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);

        const next: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const idx = Math.floor((i / BAR_COUNT) * usable);
          const raw = Math.pow((data[idx] || 0) / 255, 0.65);
          next.push(Math.max(0.06, Math.min(1, raw)));
        }

        const prev = smoothLevelsRef.current;
        const smoothed = next.map((v, i) => {
          const p = prev[i] ?? 0.08;
          return p + (v - p) * 0.3;
        });
        smoothLevelsRef.current = smoothed;
        setAudioLevels([...smoothed]);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* visualizer optional */
    }
  }, []);

  // ─── Upload voice to Cloudinary ───────────────────────────────────────────
  const uploadVoiceToCloudinary = useCallback(
    async (blob: Blob, duration: number): Promise<string | null> => {
      setIsUploadingVoice(true);
      try {
        console.log("📤 Starting voice upload...");
        console.log("📁 Blob size:", blob.size, "bytes");
        console.log("📁 Blob type:", blob.type);

        // ✅ FIX: Use Blob directly, not File constructor
        const formData = new FormData();
        // ✅ Append as blob with filename - this works everywhere
        formData.append("file", blob, `voice-${Date.now()}.webm`);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("resource_type", "video");

        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
        console.log("🌐 Upload URL:", uploadUrl);

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });

        console.log("📡 Response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ Cloudinary error:", errorData);
          throw new Error(
            errorData.error?.message || `Upload failed: ${response.status}`,
          );
        }

        const data = await response.json();
        console.log("✅ Upload successful!");
        console.log("🔗 Audio URL:", data.secure_url);

        return data.secure_url;
      } catch (error: any) {
        console.error("❌ Voice upload error:", error);
        console.error("❌ Error details:", error.message);
        return null;
      } finally {
        setIsUploadingVoice(false);
      }
    },
    [],
  );

  // ─── Recording ───────────────────────────────────────────────────────────
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

      const mime = getSupportedMimeType();
      const mediaRecorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const finalDuration = recordingDurationRef.current;
        clearRecordingTimer();
        stopVisualizer();
        stopTracks();

        const blobType = mediaRecorder.mimeType || mime || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: blobType });

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

        const dur = Math.max(1, finalDuration || 1);
        setAudioDuration(dur);
        setAudioProgress(0);

        // ✅ TRY TO UPLOAD - BUT DO NOT AUTO-SEND
        // Just upload and store the URL, let user click send
        const uploadedUrl = await uploadVoiceToCloudinary(blob, dur);

        if (uploadedUrl) {
          // ✅ Store the uploaded URL in the preview
          setMediaPreview((prev) =>
            prev ? { ...prev, url: uploadedUrl } : null,
          );
          // ✅ Update the preview audio URL to play from Cloudinary
          setPreviewAudioUrl(uploadedUrl);
          toast.success("Voice uploaded! Tap send to share.");
        } else {
          // ❌ Upload failed - keep local preview for retry
          toast.error("Upload failed. Tap send to retry.");
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
      setRecordingBlob(null);
      setAudioProgress(0);
      setIsPlaying(false);

      startVisualizer(stream);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => {
          const next = d + 1;
          recordingDurationRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      toast.error(
        "Unable to access microphone. Please check permissions in your browser settings.",
      );
      stopVisualizer();
      stopTracks();
      setIsRecording(false);
    }
  }, [
    startVisualizer,
    stopVisualizer,
    uploadVoiceToCloudinary,
    onSend,
    onVoiceRecording,
  ]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    } else {
      clearRecordingTimer();
      stopVisualizer();
      stopTracks();
      setIsRecording(false);
    }
  }, [stopVisualizer]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const discardRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    setPreviewAudioUrl(null);
    setRecordingBlob(null);
    setMediaPreview(null);
    setAudioDuration(0);
    setAudioProgress(0);
    setIsPlaying(false);
  }, [previewAudioUrl]);

  const activeAudioUrl =
    previewAudioUrl ||
    (mediaPreview?.type === "audio" ? mediaPreview.url : null);

  // ─── Preview playback (progress bar) ─────────────────────────────────────
  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeAudioUrl) return;
    if (audio.paused) {
      audio.play().catch((err) => console.error("Audio playback error:", err));
    } else {
      audio.pause();
    }
  }, [activeAudioUrl]);

  const handleAudioTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const d =
      isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : audioDuration;

    if (d > 0) {
      setAudioProgress(Math.min(100, (audio.currentTime / d) * 100));
    }
  }, [audioDuration]);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setAudioProgress(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  }, []);

  const handleAudioSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      const pct = parseFloat(e.target.value);
      setAudioProgress(pct);

      if (!audio) return;
      const d =
        isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : audioDuration;
      if (d > 0) audio.currentTime = (pct / 100) * d;
    },
    [audioDuration],
  );

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration) && audio.duration > 0) {
      setAudioDuration(audio.duration);
    }
  }, []);

  // Fallback: rAF progress while playing (if timeupdate is sparse)
  useEffect(() => {
    if (!isPlaying) return;
    let id = 0;
    const tick = () => {
      handleAudioTimeUpdate();
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [isPlaying, handleAudioTimeUpdate]);

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
    // If we have a voice recording
    if (mediaPreview?.type === "audio") {
      const audioUrl = mediaPreview.url;

      // ✅ If URL is local (starts with blob:), try to re-upload
      if (audioUrl.startsWith("blob:")) {
        if (recordingBlob) {
          setIsUploadingVoice(true);
          const dur = Math.max(
            1,
            Math.floor(audioDuration || recordingDurationRef.current || 1),
          );
          uploadVoiceToCloudinary(recordingBlob, dur).then((url) => {
            setIsUploadingVoice(false);
            if (url) {
              onSend("🎤 Voice message", "VOICE_NOTE", url);
              toast.success("Voice message sent!");
              discardRecording();
            } else {
              toast.error("Failed to upload voice. Please try again.");
            }
          });
        }
        return;
      }

      // ✅ If URL is already from Cloudinary, send it
      if (audioUrl.includes("cloudinary.com")) {
        onSend("🎤 Voice message", "VOICE_NOTE", audioUrl);
        toast.success("Voice message sent!");
        discardRecording();
        setContent("");
        setFileAttachment(null);
        setShowAttachmentMenu(false);
        setShowEmojiPicker(false);
        stopTyping();
        return;
      }
    }

    // ... rest of the send logic for text, images, etc.
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
    uploadVoiceToCloudinary,
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
        toast.error("File size exceeds 50MB limit");
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
      stopVisualizer();
      stopTracks();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
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

      {activeAudioUrl && (
        <audio
          key={activeAudioUrl}
          ref={audioRef}
          src={activeAudioUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="hidden"
          preload="auto"
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

      {/* Live recording UI + spectrum */}
      {isRecording && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-red-100 bg-red-50">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>

          <div className="flex h-8 flex-1 items-center gap-[2px]">
            {audioLevels.map((level, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-red-500"
                style={{
                  height: `${Math.max(12, level * 100)}%`,
                  opacity: 0.35 + level * 0.65,
                  transition: "height 40ms linear",
                }}
              />
            ))}
          </div>

          <span className="min-w-[40px] text-right text-sm font-semibold tabular-nums text-red-600">
            {formatDuration(recordingDuration)}
          </span>

          <button
            type="button"
            onClick={stopRecording}
            className="shrink-0 rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
          >
            Stop
          </button>
        </div>
      )}

      {/* Preview / attachments */}
      {(mediaPreview || fileAttachment || isUploading) &&
        !isEditMode &&
        !isRecording && (
          <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
            {isUploadingVoice && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold px-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading voice…
              </div>
            )}
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
                    step={0.1}
                    value={audioProgress}
                    onChange={handleAudioSeek}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-xs font-mono text-slate-600 min-w-[40px]">
                    {formatDuration(
                      isPlaying || audioProgress > 0
                        ? (audioProgress / 100) * audioDuration
                        : audioDuration,
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={removeAttachment}
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
                () => toast.error("Unable to get location."),
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
            disabled={!canSend || isUploadingVoice}
            className={`p-2.5 rounded-xl shrink-0 ${
              !canSend || isUploadingVoice
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : isEditMode
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
            title={isEditMode ? "Save" : "Send"}
          >
            {isUploading || isUploadingVoice ? (
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
