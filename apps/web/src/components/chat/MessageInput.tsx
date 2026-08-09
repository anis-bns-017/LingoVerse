import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

interface MessageInputProps {
  onSend: (
    content: string, 
    type?: string, 
    mediaUrl?: string, 
    fileUrl?: string
  ) => void;
  onTyping?: (isTyping: boolean) => void;
  onVoiceRecording?: () => void;
  isRecording?: boolean;
  recordingDuration?: number;
  editingMessage?: {
    id: string;
    content: string;
  } | null;
  onCancelEdit?: () => void;
  isConnected?: boolean;
  onEmojiPickerToggle?: () => void;
  onAttachmentToggle?: () => void;
  onSelectMessages?: () => void;
  isSelectionMode?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ 
  onSend, 
  onTyping,
  onVoiceRecording,
  isRecording = false,
  recordingDuration = 0,
  editingMessage = null,
  onCancelEdit,
  isConnected = true,
  onEmojiPickerToggle,
  onAttachmentToggle,
  onSelectMessages,
  isSelectionMode = false,
}) => {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: 'image' | 'video' | 'audio' | 'file';
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Sync content when editing starts / ends ─────────────────────────────
  useEffect(() => {
    if (editingMessage) {
      // Start editing → fill textarea + clear any attachments
      setContent(editingMessage.content || '');
      setMediaPreview(null);
      setFileAttachment(null);
      setShowAttachmentMenu(false);
      setShowEmojiPicker(false);

      // Focus after a tiny delay so the layout has settled
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        // Move cursor to end
        const len = editingMessage.content?.length || 0;
        textareaRef.current?.setSelectionRange(len, len);
      });
    }
  }, [editingMessage?.id]); // only when a *new* message starts being edited

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [content]);

  const stopTyping = useCallback(() => {
    if (isTypingState) {
      setIsTypingState(false);
      onTyping?.(false);
    }
  }, [isTypingState, onTyping]);

  const handleTyping = useCallback((value: string) => {
    setContent(value);

    if (value.trim().length > 0) {
      if (!isTypingState) {
        setIsTypingState(true);
        onTyping?.(true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    } else {
      stopTyping();
    }
  }, [isTypingState, onTyping, stopTyping]);

  // ─── Cancel edit ─────────────────────────────────────────────────────────
  const handleCancelEdit = useCallback(() => {
    setContent('');
    setMediaPreview(null);
    setFileAttachment(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onCancelEdit?.();
  }, [onCancelEdit]);

  // ─── Send / Confirm edit ─────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!content.trim() && !mediaPreview && !fileAttachment) return;

    let messageType = 'TEXT';
    let mediaUrl = mediaPreview?.url;
    let fileUrl = fileAttachment?.url;

    if (mediaPreview) {
      messageType = mediaPreview.type === 'video' ? 'VIDEO' : 
                    mediaPreview.type === 'audio' ? 'AUDIO' : 'IMAGE';
    } else if (fileAttachment) {
      messageType = 'FILE';
    }

    // Parent (ChatWindow) decides whether this is an edit or a new message
    onSend(content.trim(), messageType, mediaUrl, fileUrl);

    // Always reset local state after send/edit
    setContent('');
    setMediaPreview(null);
    setFileAttachment(null);
    setShowAttachmentMenu(false);
    setShowEmojiPicker(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping();
  }, [content, mediaPreview, fileAttachment, onSend, stopTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && editingMessage) {
      handleCancelEdit();
    }
  }, [handleSend, editingMessage, handleCancelEdit]);

  const handleFileUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'image' | 'video' | 'audio' | 'file'
  ) => {
    // Disable file uploads while editing (edit is text-only)
    if (editingMessage) return;

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit');
      return;
    }

    setIsUploading(true);
    
    const url = URL.createObjectURL(file);
    
    if (type === 'image') {
      setMediaPreview({ url, type: 'image' });
    } else if (type === 'video') {
      setMediaPreview({ url, type: 'video', name: file.name });
    } else if (type === 'audio') {
      setMediaPreview({ url, type: 'audio', name: file.name });
    } else {
      setFileAttachment({ 
        name: file.name, 
        url,
        size: file.size,
        type: file.type
      });
    }
    
    setIsUploading(false);
    setShowAttachmentMenu(false);
  }, [editingMessage]);

  const removeAttachment = useCallback(() => {
    setMediaPreview(null);
    setFileAttachment(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (mediaPreview?.url) URL.revokeObjectURL(mediaPreview.url);
      if (fileAttachment?.url) URL.revokeObjectURL(fileAttachment.url);
    };
  }, [mediaPreview, fileAttachment]);

  const isEditMode = !!editingMessage;
  const canSend = (content.trim() || mediaPreview || fileAttachment) && !isUploading && !isRecording && !isSelectionMode;

  return (
    <div className="space-y-2">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'image')}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'video')}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'audio')}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv,.json,.xml,.html"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'file')}
      />

      {/* Connection status */}
      {!isConnected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs text-amber-700 font-medium">
            Reconnecting… Messages will be sent when connection is restored
          </span>
        </div>
      )}

      {/* Attachment Preview */}
      {(mediaPreview || fileAttachment || isUploading) && !isEditMode && (
        <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
          {isUploading ? (
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold px-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading…</span>
            </div>
          ) : (
            <>
              {mediaPreview && (
                <div className="relative group">
                  {mediaPreview.type === 'image' ? (
                    <img
                      src={mediaPreview.url}
                      alt="preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                    />
                  ) : mediaPreview.type === 'video' ? (
                    <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center relative">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  ) : mediaPreview.type === 'audio' ? (
                    <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Music className="w-6 h-6 text-indigo-600" />
                    </div>
                  ) : null}
                  <button
                    onClick={removeAttachment}
                    className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white p-0.5 rounded-full hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {fileAttachment && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 max-w-[200px]">
                  <File className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{fileAttachment.name}</span>
                  {fileAttachment.size && (
                    <span className="text-[10px] text-slate-400">
                      {formatFileSize(fileAttachment.size)}
                    </span>
                  )}
                  <button
                    onClick={removeAttachment}
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Attachment menu (disabled while editing) */}
      {showAttachmentMenu && !isEditMode && (
        <div className="flex flex-wrap gap-1 p-2 bg-white border border-slate-200 rounded-xl shadow-lg">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-blue-500" />
            Image
          </button>
          <button
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition-colors"
          >
            <Video className="w-4 h-4 text-red-500" />
            Video
          </button>
          <button
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition-colors"
          >
            <Music className="w-4 h-4 text-purple-500" />
            Audio
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition-colors"
          >
            <File className="w-4 h-4 text-orange-500" />
            Document
          </button>
          <button
            onClick={() => {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  onSend(`📍 Location: ${latitude}, ${longitude}`, 'LOCATION');
                  setShowAttachmentMenu(false);
                },
                () => alert('Unable to get location.')
              );
            }}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition-colors"
          >
            <MapPin className="w-4 h-4 text-emerald-500" />
            Location
          </button>
          <button
            onClick={() => {
              onSend('📇 Contact shared', 'CONTACT');
              setShowAttachmentMenu(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition-colors"
          >
            <AtSign className="w-4 h-4 text-indigo-500" />
            Contact
          </button>
        </div>
      )}

      {/* Main Input Bar */}
      <div className={`flex items-end gap-2 bg-white border p-2 rounded-2xl transition-all shadow-sm ${
        isEditMode 
          ? 'border-amber-400 ring-2 ring-amber-400/20' 
          : 'border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20'
      }`}>
        {/* Left Actions */}
        <div className="flex items-center gap-0.5 pb-1">
          {!isEditMode && (
            <>
              <button
                type="button"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  onEmojiPickerToggle?.();
                }}
                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-100 rounded-xl transition-colors"
                title="Add emoji"
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

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isEditMode 
              ? "Edit your message… (Esc to cancel)" 
              : isRecording 
                ? "Recording voice message…" 
                : isSelectionMode
                  ? "Select messages…"
                  : "Type a message… (Shift + Enter for new line)"
          }
          rows={1}
          disabled={isRecording || isSelectionMode}
          className={`flex-1 bg-transparent py-1.5 px-1 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-32 custom-scrollbar ${
            isRecording ? 'text-red-500' : ''
          }`}
        />

        {/* Right Actions */}
        <div className="flex items-center gap-0.5 pb-1">
          {/* Cancel edit button */}
          {isEditMode && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
              title="Cancel edit (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Voice recording (disabled while editing) */}
          {!isEditMode && (
            <button
              type="button"
              onClick={onVoiceRecording}
              className={`p-2 rounded-xl transition-colors relative ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
              }`}
              title={isRecording ? 'Stop recording' : 'Voice message'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {isRecording && (
            <span className="text-xs font-mono text-red-500 font-bold min-w-[40px]">
              {formatDuration(recordingDuration)}
            </span>
          )}

          {/* Selection mode (disabled while editing) */}
          {!isEditMode && (
            <button
              type="button"
              onClick={onSelectMessages}
              className={`p-2 rounded-xl transition-colors ${
                isSelectionMode
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
              }`}
              title={isSelectionMode ? 'Exit selection' : 'Select messages'}
            >
              {isSelectionMode ? <CircleCheck className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </button>
          )}

          {/* Send / Confirm Edit button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`p-2.5 rounded-xl transition-all shadow-sm shrink-0 ${
              !canSend
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : isEditMode
                  ? 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-200/50'
            }`}
            title={isEditMode ? "Save edit (Enter)" : "Send message (Enter)"}
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

      {/* Quick emoji picker */}
      {showEmojiPicker && !isEditMode && (
        <div className="flex flex-wrap gap-1 p-2 bg-white border border-slate-200 rounded-xl shadow-lg">
          {['😊', '😂', '❤️', '🔥', '👍', '👏', '🙏', '🎉', '😍', '🤔', '😭', '🥺', '💯', '✨', '🌟', '🎊'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setContent(prev => prev + emoji);
                setShowEmojiPicker(false);
                textareaRef.current?.focus();
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-xl transition-colors hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};