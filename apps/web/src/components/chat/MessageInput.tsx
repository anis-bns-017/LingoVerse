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
  Sticker,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

const BAR_COUNT = 40;

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET_VOICE =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_VOICE ||
  "lingoverse_voice_messages";
const CLOUDINARY_UPLOAD_PRESET_IMAGE =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_IMAGE ||
  "lingoverse_chat_images";
const CLOUDINARY_UPLOAD_PRESET_VIDEO =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_VIDEO ||
  "lingoverse_chat_videos";
const CLOUDINARY_UPLOAD_PRESET_FILE =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_FILE || "lingoverse_chat_files";
const CLOUDINARY_UPLOAD_PRESET_AVATAR =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_AVATAR ||
  "lingoverse_user_avatars";

const getUploadPreset = (type: string) => {
  switch (type) {
    case "audio":
    case "voice":
      return CLOUDINARY_UPLOAD_PRESET_VOICE;
    case "image":
      return CLOUDINARY_UPLOAD_PRESET_IMAGE;
    case "video":
      return CLOUDINARY_UPLOAD_PRESET_VIDEO;
    case "avatar":
      return CLOUDINARY_UPLOAD_PRESET_AVATAR;
    default:
      return CLOUDINARY_UPLOAD_PRESET_FILE;
  }
};

const getResourceType = (type: string) => {
  switch (type) {
    case "image":
      return "image";
    case "video":
      return "video";
    case "audio":
    case "voice":
      return "video";
    default:
      return "auto";
  }
};

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
  const [isFocused, setIsFocused] = useState(false);

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

  const uploadToCloudinary = useCallback(
    async (file: File, type: string): Promise<string | null> => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", getUploadPreset(type));

        const resourceType = getResourceType(type);
        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

        const response = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message || `Upload failed: ${response.status}`,
          );
        }

        const data = await response.json();
        return data.secure_url;
      } catch (error: any) {
        console.error(`Upload error (${type}):`, error);
        return null;
      }
    },
    [],
  );

  const uploadVoiceToCloudinary = useCallback(
    async (blob: Blob, duration: number): Promise<string | null> => {
      setIsUploadingVoice(true);
      try {
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        const url = await uploadToCloudinary(file, "voice");
        return url;
      } catch (error: any) {
        console.error("Voice upload error:", error);
        return null;
      } finally {
        setIsUploadingVoice(false);
      }
    },
    [uploadToCloudinary],
  );

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

        const uploadedUrl = await uploadVoiceToCloudinary(blob, dur);

        if (uploadedUrl) {
          setMediaPreview((prev) =>
            prev ? { ...prev, url: uploadedUrl } : null,
          );
          setPreviewAudioUrl(uploadedUrl);
          toast.success("🎙️ Voice message ready to send!");
        } else {
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
  }, [startVisualizer, stopVisualizer, uploadVoiceToCloudinary]);

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
    if (mediaPreview?.type === "audio") {
      const audioUrl = mediaPreview.url;

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
              toast.success("🎙️ Voice message sent!");
              discardRecording();
            } else {
              toast.error("Failed to upload voice. Please try again.");
            }
          });
        }
        return;
      }

      if (audioUrl.includes("cloudinary.com")) {
        onSend("🎤 Voice message", "VOICE_NOTE", audioUrl);
        toast.success("🎙️ Voice message sent!");
        discardRecording();
        setContent("");
        setFileAttachment(null);
        setShowAttachmentMenu(false);
        setShowEmojiPicker(false);
        stopTyping();
        return;
      }
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

  // ✅ FIXED: handleFileUpload with proper image preview
  const handleFileUpload = useCallback(
    async (
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

      try {
        // Create local URL for preview
        const localUrl = URL.createObjectURL(file);
        console.log("📸 Local URL created:", localUrl);

        // Set preview IMMEDIATELY
        if (type === "image") {
          setMediaPreview({ 
            url: localUrl, 
            type: "image" 
          });
          console.log("✅ Image preview state updated with local URL");
        } else if (type === "video") {
          setMediaPreview({ 
            url: localUrl, 
            type: "video", 
            name: file.name 
          });
        } else if (type === "audio") {
          setMediaPreview({ 
            url: localUrl, 
            type: "audio", 
            name: file.name 
          });
        } else {
          setFileAttachment({
            name: file.name,
            url: localUrl,
            size: file.size,
            type: file.type,
          });
        }

        // Upload to Cloudinary
        const uploadedUrl = await uploadToCloudinary(file, type);

        if (uploadedUrl) {
          // Update preview with Cloudinary URL
          if (type === "image") {
            setMediaPreview({ 
              url: uploadedUrl, 
              type: "image" 
            });
            console.log("✅ Cloudinary URL set:", uploadedUrl);
          } else if (type === "video") {
            setMediaPreview({
              url: uploadedUrl,
              type: "video",
              name: file.name,
            });
          } else if (type === "audio") {
            setMediaPreview({
              url: uploadedUrl,
              type: "audio",
              name: file.name,
            });
          } else {
            setFileAttachment({
              name: file.name,
              url: uploadedUrl,
              size: file.size,
              type: file.type,
            });
          }

          // Clean up local URL after upload
          URL.revokeObjectURL(localUrl);

          toast.success(
            `📤 ${type.charAt(0).toUpperCase() + type.slice(1)} uploaded!`,
          );
        } else {
          toast.warning("⚠️ Upload failed. Using local preview.");
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload file");
      } finally {
        setIsUploading(false);
        setShowAttachmentMenu(false);
        // Reset input
        e.target.value = "";
      }
    },
    [editingMessage, uploadToCloudinary],
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
    <motion.div
      layout
      className="space-y-2.5"
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
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
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl"
        >
          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs text-amber-700 font-medium">
            Reconnecting… Messages will send when connected
          </span>
          <div className="flex-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </motion.div>
      )}

      {/* Recording UI */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="relative flex h-3 w-3 shrink-0"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </motion.span>

              <div className="flex h-10 flex-1 items-center gap-[2px]">
                {audioLevels.map((level, i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] rounded-full bg-gradient-to-t from-red-500 to-rose-500"
                    style={{
                      height: `${Math.max(12, level * 100)}%`,
                      opacity: 0.35 + level * 0.65,
                    }}
                    transition={{ duration: 0.05 }}
                  />
                ))}
              </div>

              <motion.span
                key={recordingDuration}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="min-w-[44px] text-right text-sm font-bold tabular-nums text-red-600"
              >
                {formatDuration(recordingDuration)}
              </motion.span>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={stopRecording}
                className="shrink-0 rounded-full bg-gradient-to-r from-red-500 to-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all"
              >
                Stop Recording
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview */}
      <AnimatePresence>
        {(mediaPreview || fileAttachment || isUploading) &&
          !isEditMode &&
          !isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-sm"
            >
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
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={togglePlayback}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 hover:from-indigo-200 hover:to-violet-200 flex items-center justify-center text-indigo-600 shrink-0 transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </motion.button>
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
                    <span className="text-xs font-mono font-semibold text-slate-600 min-w-[40px]">
                      {formatDuration(
                        isPlaying || audioProgress > 0
                          ? (audioProgress / 100) * audioDuration
                          : audioDuration,
                      )}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={removeAttachment}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              ) : mediaPreview?.type === "image" ? (
                /* ✅ FIXED: Image Preview with proper rendering */
                <div className="relative group/preview">
                  <div className="w-16 h-16 rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-slate-50">
                    {mediaPreview.url ? (
                      <img
                        src={mediaPreview.url}
                        alt="Preview"
                        className="w-full h-full object-cover transition-all"
                        onLoad={() => {
                          console.log("✅ Image loaded successfully:", mediaPreview.url);
                        }}
                        onError={(e) => {
                          console.error("❌ Image failed to load:", mediaPreview.url);
                          const target = e.target as HTMLImageElement;
                          // Show fallback emoji
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-full h-full flex items-center justify-center text-4xl';
                            fallback.textContent = '🖼️';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={removeAttachment}
                    className="absolute -top-2 -right-2 bg-slate-900 text-white p-0.5 rounded-full shadow-lg opacity-0 group-hover/preview:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              ) : mediaPreview?.type === "video" ? (
                <div className="relative group/preview w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                  <Video className="w-6 h-6 text-white" />
                  <span className="absolute bottom-1 right-1 text-[8px] text-white/70 bg-black/50 px-1 rounded">
                    {mediaPreview.name || "Video"}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={removeAttachment}
                    className="absolute -top-2 -right-2 bg-slate-900 text-white p-0.5 rounded-full shadow-lg opacity-0 group-hover/preview:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              ) : null}

              {fileAttachment && (
                <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 max-w-[200px] shadow-sm">
                  <File className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="truncate">{fileAttachment.name}</span>
                  {fileAttachment.size != null && (
                    <span className="text-[10px] text-slate-400">
                      {formatFileSize(fileAttachment.size)}
                    </span>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={removeAttachment}
                    className="text-slate-400 hover:text-rose-600 ml-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
      </AnimatePresence>

      {/* Attachment Menu */}
      <AnimatePresence>
        {showAttachmentMenu && !isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="flex flex-wrap gap-1 p-2.5 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-xl"
          >
            {[
              {
                icon: ImageIcon,
                label: "Image",
                action: imageInputRef,
                color: "blue",
              },
              {
                icon: Video,
                label: "Video",
                action: videoInputRef,
                color: "red",
              },
              {
                icon: Music,
                label: "Audio",
                action: audioInputRef,
                color: "purple",
              },
              {
                icon: File,
                label: "Document",
                action: fileInputRef,
                color: "orange",
              },
              { icon: ImageIcon, label: "GIF", action: null, color: "pink" },
              {
                icon: Sticker,
                label: "Sticker",
                action: null,
                color: "emerald",
              },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => {
                  if (item.action?.current) {
                    item.action.current.click();
                  } else {
                    toast.info(`${item.label} coming soon!`);
                    setShowAttachmentMenu(false);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-2 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-600 transition-all`}
              >
                <item.icon className={`w-4 h-4 text-${item.color}-500`} />
                {item.label}
              </motion.button>
            ))}
            <div className="w-px h-8 bg-slate-200 mx-1" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
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
              className="flex items-center gap-2 px-3.5 py-2 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-600 transition-all"
            >
              <MapPin className="w-4 h-4 text-emerald-500" />
              Location
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                onSend("📇 Contact shared", "CONTACT");
                setShowAttachmentMenu(false);
              }}
              className="flex items-center gap-2 px-3.5 py-2 hover:bg-slate-50 rounded-xl text-xs font-medium text-slate-600 transition-all"
            >
              <AtSign className="w-4 h-4 text-indigo-500" />
              Contact
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      <motion.div
        className={`flex items-end gap-2 bg-white/95 backdrop-blur-sm border p-2 rounded-2xl shadow-sm transition-all ${
          isEditMode
            ? "border-amber-400 ring-2 ring-amber-400/30 shadow-amber-500/10"
            : isFocused
              ? "border-indigo-500 ring-2 ring-indigo-500/30 shadow-indigo-500/10"
              : "border-slate-200/80 hover:border-slate-300"
        }`}
        animate={{
          scale: isRecording ? 1.02 : 1,
        }}
      >
        <div className="flex items-center gap-0.5 pb-1">
          {!isEditMode && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className={`p-2 rounded-xl transition-all ${
                  showAttachmentMenu
                    ? "bg-indigo-100 text-indigo-600"
                    : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                }`}
                title="Attach"
              >
                <Plus
                  className={`w-4 h-4 transition-transform ${showAttachmentMenu ? "rotate-45" : ""}`}
                />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  onEmojiPickerToggle?.();
                }}
                className={`p-2 rounded-xl transition-all ${
                  showEmojiPicker
                    ? "bg-amber-100 text-amber-600"
                    : "text-slate-400 hover:text-amber-500 hover:bg-slate-100"
                }`}
                title="Emoji"
              >
                <Smile className="w-4 h-4" />
              </motion.button>
            </>
          )}
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-100/80 rounded-xl"
            >
              <Edit className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-semibold text-amber-700">
                Editing
              </span>
            </motion.div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            isEditMode
              ? "Edit your message… (Esc to cancel)"
              : isRecording
                ? "Recording voice message…"
                : isSelectionMode
                  ? "Select messages to manage"
                  : "Type a message…"
          }
          rows={1}
          disabled={isRecording || isSelectionMode}
          className="flex-1 bg-transparent py-2 px-1 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-32 min-h-[40px]"
        />

        <div className="flex items-center gap-0.5 pb-1">
          {isEditMode && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleCancelEdit}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}

          {!isEditMode && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={toggleRecording}
              className={`p-2 rounded-xl transition-all relative ${
                isRecording
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
              }`}
              title={isRecording ? "Stop recording" : "Record voice message"}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {!isRecording && !isEditMode && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </motion.button>
          )}

          {!isEditMode && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={onSelectMessages}
              className={`p-2 rounded-xl transition-all ${
                isSelectionMode
                  ? "bg-indigo-100 text-indigo-600"
                  : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
              }`}
              title="Select messages"
            >
              {isSelectionMode ? (
                <CircleCheck className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </motion.button>
          )}

          <motion.button
            whileHover={!(!canSend || isUploadingVoice) ? { scale: 1.05 } : {}}
            whileTap={!(!canSend || isUploadingVoice) ? { scale: 0.9 } : {}}
            type="button"
            onClick={handleSend}
            disabled={!canSend || isUploadingVoice}
            className={`p-2.5 rounded-xl shrink-0 transition-all ${
              !canSend || isUploadingVoice
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : isEditMode
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/30 text-white"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-lg hover:shadow-indigo-500/30 text-white"
            }`}
            title={isEditMode ? "Save changes" : "Send message"}
          >
            {isUploading || isUploadingVoice ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isEditMode ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && !isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="flex flex-wrap gap-1 p-3 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-xl"
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
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.3, rotate: -5 }}
                whileTap={{ scale: 0.8 }}
                type="button"
                onClick={() => {
                  setContent((prev) => prev + emoji);
                  setShowEmojiPicker(false);
                  textareaRef.current?.focus();
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-xl transition-all"
              >
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};