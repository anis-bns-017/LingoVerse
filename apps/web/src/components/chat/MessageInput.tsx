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
  CheckCheck,
  Clock,
  Edit,
  File,
  Video,
  Music,
  AtSign,
  Hash,
  Link as LinkIcon,
  Calendar,
  MapPin,
  Gift,
  FolderOpen,
  ImagePlus,
  FilePlus,
  Circle,
  CircleCheck,
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
  const [showReconnect, setShowReconnect] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Handle connection status with delay
  useEffect(() => {
    console.log('🔌 MessageInput isConnected:', isConnected);
    
    if (!isConnected) {
      // Show reconnecting message after 2 seconds of disconnection
      const timer = setTimeout(() => {
        setShowReconnect(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowReconnect(false);
    }
  }, [isConnected]);

  // Reset content when editing message changes
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

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

    onSend(content.trim(), messageType, mediaUrl, fileUrl);

    // Reset form
    setContent('');
    setMediaPreview(null);
    setFileAttachment(null);

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
      onCancelEdit?.();
    }
  }, [handleSend, editingMessage, onCancelEdit]);

  const handleFileUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'image' | 'video' | 'audio' | 'file'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit');
      return;
    }

    setIsUploading(true);
    
    // For files, create a URL for preview
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
  }, []);

  const removeAttachment = useCallback(() => {
    setMediaPreview(null);
    setFileAttachment(null);
    // Clear file inputs
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Revoke object URLs
      if (mediaPreview?.url) URL.revokeObjectURL(mediaPreview.url);
      if (fileAttachment?.url) URL.revokeObjectURL(fileAttachment.url);
    };
  }, [mediaPreview, fileAttachment]);

  return (
    <div className="space-y-2">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'image')}
        multiple={false}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'video')}
        multiple={false}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'audio')}
        multiple={false}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv,.json,.xml,.html"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'file')}
        multiple={false}
      />

      {/* ✅ Connection status - Only show after delay and when truly disconnected */}
      {showReconnect && !isConnected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl animate-pulse">
          <Clock className="w-4 h-4 text-amber-500 animate-spin" />
          <span className="text-xs text-amber-700 font-medium">
            Reconnecting... Messages will be sent when connection is restored
          </span>
          <button 
            onClick={() => {
              setShowReconnect(false);
              // Force reconnection attempt
              window.location.reload();
            }}
            className="ml-auto text-xs text-amber-600 hover:text-amber-800 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Attachment Preview Bar */}
      {(mediaPreview || fileAttachment || isUploading) && (
        <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
          {isUploading ? (
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold px-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading attachment...</span>
            </div>
          ) : (
            <>
              {mediaPreview && (
                <div className="relative group">
                  {mediaPreview.type === 'image' ? (
                    <img
                      src={mediaPreview.url}
                      alt="upload preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                    />
                  ) : mediaPreview.type === 'video' ? (
                    <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center relative">
                      <Video className="w-6 h-6 text-white" />
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] text-white bg-black/50 px-1 rounded">
                        Video
                      </span>
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

      {/* Editing indicator */}
      {editingMessage && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
          <Edit className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs text-amber-700 font-medium">
            Editing message
          </span>
          <button
            onClick={onCancelEdit}
            className="ml-auto p-0.5 hover:bg-amber-200 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5 text-amber-600" />
          </button>
        </div>
      )}

      {/* Attachment menu */}
      {showAttachmentMenu && (
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
              // Handle location sharing
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  onSend(`📍 Location: ${latitude}, ${longitude}`, 'LOCATION');
                  setShowAttachmentMenu(false);
                },
                (error) => {
                  alert('Unable to get location. Please enable location services.');
                }
              );
            }}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-600 transition-colors"
          >
            <MapPin className="w-4 h-4 text-emerald-500" />
            Location
          </button>
          <button
            onClick={() => {
              // Handle contact sharing
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

      {/* Main Input Control Bar */}
      <div className="flex items-end gap-2 bg-white border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 p-2 rounded-2xl transition-all shadow-sm">
        {/* Left Actions */}
        <div className="flex items-center gap-0.5 pb-1">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors relative"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
            {showAttachmentMenu && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </button>

          {/* Emoji button */}
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
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            editingMessage 
              ? "Edit your message..." 
              : isRecording 
                ? "Recording voice message..." 
                : isSelectionMode
                  ? "Select messages to perform actions"
                  : "Type a message... (Shift + Enter for new line)"
          }
          rows={1}
          disabled={isRecording || isSelectionMode}
          className={`flex-1 bg-transparent py-1.5 px-1 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-32 custom-scrollbar ${
            isRecording ? 'text-red-500' : ''
          }`}
        />

        {/* Right Actions */}
        <div className="flex items-center gap-0.5 pb-1">
          {/* Voice recording button */}
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
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              </>
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Recording duration */}
          {isRecording && (
            <span className="text-xs font-mono text-red-500 font-bold min-w-[40px]">
              {formatDuration(recordingDuration)}
            </span>
          )}

          {/* Selection mode toggle */}
          <button
            type="button"
            onClick={onSelectMessages}
            className={`p-2 rounded-xl transition-colors ${
              isSelectionMode
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
            }`}
            title={isSelectionMode ? 'Exit selection mode' : 'Select messages'}
          >
            {isSelectionMode ? <CircleCheck className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={(!content.trim() && !mediaPreview && !fileAttachment) || isUploading || isRecording || isSelectionMode}
            className={`p-2.5 rounded-xl transition-all shadow-sm shrink-0 ${
              (!content.trim() && !mediaPreview && !fileAttachment) || isUploading || isRecording || isSelectionMode
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-200/50'
            }`}
            title="Send message (Enter)"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : editingMessage ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Quick emoji picker (simplified) */}
      {showEmojiPicker && (
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