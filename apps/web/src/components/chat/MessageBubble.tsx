import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import type { Message } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import {
  Reply,
  Smile,
  Check,
  FileText,
  CornerDownRight,
  Play,
  Mic,
  Languages,
  Pencil,
  Pin,
  PinOff,
  CheckCheck,
  Clock,
  Image as ImageIcon,
  Film,
  Music,
  File,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉', '🙏', '💯'];

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

  // Aggregate reactions by emoji, and track whether the current user is
  // among the reactors so their own reaction can be highlighted/toggled.
  const aggregatedReactions: Record<string, { count: number; mine: boolean }> =
    (message.reactions || []).reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
      acc[r.emoji].count += 1;
      if (r.userId === user?.id) acc[r.emoji].mine = true;
      return acc;
    }, {} as Record<string, { count: number; mine: boolean }>);

  const translation = message.translations?.[0];
  const isVoiceNote = message.type === 'VOICE_NOTE';
  const isSticker = message.type === 'STICKER';
  const isImage = message.type === 'IMAGE';
  const isVideo = message.type === 'VIDEO';
  const isAudio = message.type === 'AUDIO';

  const handleReactionBadgeClick = (emoji: string) => {
    onReact?.(emoji);
  };

  const renderAttachment = (att: { id: string; url: string; type: string; filename: string }) => {
    switch (att.type) {
      case 'IMAGE':
        return (
          <div key={att.id} className="relative group/image">
            <img
              src={att.url}
              alt={att.filename}
              className="w-full max-h-60 object-cover rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowFullImage(true)}
            />
            <button
              onClick={() => window.open(att.url, '_blank')}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover/image:opacity-100 transition-opacity"
            >
              <FileText className="w-3 h-3" />
            </button>
          </div>
        );
      case 'VIDEO':
        return (
          <div key={att.id} className="relative">
            <video 
              src={att.url} 
              controls 
              className="w-full max-h-60 rounded-2xl"
              poster={att.thumbnailUrl}
            />
          </div>
        );
      case 'AUDIO':
        return (
          <div
            key={att.id}
            className={`flex items-center gap-2 p-2.5 rounded-2xl ${
              isOwn ? 'bg-slate-800/80' : 'bg-slate-50'
            }`}
          >
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 hover:bg-indigo-600 transition-colors"
            >
              {isPlaying ? (
                <div className="flex gap-0.5 items-center h-3">
                  <span className="w-0.5 h-2 bg-white animate-pulse" />
                  <span className="w-0.5 h-3 bg-white animate-pulse [animation-delay:0.2s]" />
                  <span className="w-0.5 h-1.5 bg-white animate-pulse [animation-delay:0.4s]" />
                </div>
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
            <audio 
              ref={(el) => {
                if (el) {
                  el.onplay = () => setIsPlaying(true);
                  el.onpause = () => setIsPlaying(false);
                  el.onended = () => setIsPlaying(false);
                }
              }}
              src={att.url} 
              controls 
              className="flex-1 h-8"
            />
          </div>
        );
      default:
        return (
          <a
            key={att.id}
            href={att.url}
            target="_blank"
            rel="noreferrer"
            className={`p-2 rounded-xl flex items-center gap-2 border text-xs font-semibold ${
              isOwn
                ? 'bg-slate-800 border-slate-700 text-indigo-300'
                : 'bg-slate-50 border-slate-200 text-indigo-600'
            } hover:bg-slate-100 transition-colors`}
          >
            <File className="w-4 h-4 shrink-0" />
            <span className="truncate">{att.filename || 'View file'}</span>
          </a>
        );
    }
  };

  // Message status icon
  const MessageStatus = () => {
    if (!isOwn) return null;
    
    if (message.readReceipts && message.readReceipts.length > 0) {
      return (
        <div className="flex items-center">
          <CheckCheck className="w-3 h-3 text-blue-500" />
          <span className="text-[9px] text-blue-500 ml-0.5">
            {message.readReceipts.length}
          </span>
        </div>
      );
    }
    
    if (message.delivered) {
      return <CheckCheck className="w-3 h-3 text-slate-400" />;
    }
    
    return <Check className="w-3 h-3 text-slate-400" />;
  };

  // Sent time with relative time on hover
  const messageTime = message.createdAt ? new Date(message.createdAt) : new Date();
  const timeStr = format(messageTime, 'HH:mm');
  const relativeTime = useMemo(() => {
    const now = new Date();
    const diff = now.getTime() - messageTime.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return format(messageTime, 'MMM d');
  }, [messageTime]);

  return (
    <div
      className={`group relative flex items-end gap-2 my-1 ${
        isOwn ? 'flex-row-reverse' : 'flex-row'
      } ${isSelected ? 'bg-indigo-50/50 rounded-xl' : ''}`}
    >
      {/* Avatar - only show if not in selection mode */}
      {!isSelectionMode && !isOwn && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
          {message.sender?.avatarUrl ? (
            <img
              src={message.sender.avatarUrl}
              alt={message.sender.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            message.sender?.name?.charAt(0).toUpperCase() || 'U'
          )}
        </div>
      )}

      <div className="relative max-w-[80%] sm:max-w-[70%]">
        {/* Pinned indicator */}
        {isPinned && (
          <div className={`flex items-center gap-1 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <Pin className="w-3 h-3 text-indigo-500" />
            <span className="text-[10px] font-semibold text-indigo-500">Pinned</span>
          </div>
        )}

        {/* Hover action bar - hidden in selection mode */}
        {!isSelectionMode && (
          <div
            className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center gap-0.5 bg-white border border-slate-100 shadow-lg rounded-xl p-0.5 ${
              isOwn ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
            }`}
          >
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onReply}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            {isOwn && (
              <>
                <button
                  onClick={onEdit}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onPin?.(!isPinned)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                  title={isPinned ? 'Unpin' : 'Pin'}
                >
                  {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={onDelete}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={`absolute z-20 bottom-full mb-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-xl ${
                isOwn ? 'right-0' : 'left-0'
              }`}
            >
              <div className="grid grid-cols-5 gap-1">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact?.(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="hover:scale-125 p-1 rounded-lg text-xl transition-transform active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticker renders bare */}
        {isSticker && message.mediaUrl ? (
          <img src={message.mediaUrl} alt="sticker" className="w-32 h-32 object-contain" />
        ) : (
          <div
            className={`p-3.5 rounded-3xl text-xs space-y-1.5 shadow-sm ${
              isOwn
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
            }`}
          >
            {/* Sender name for group chats */}
            {!isOwn && (
              <div className="font-bold text-[11px] text-indigo-600">
                {message.sender?.name}
              </div>
            )}

            {/* Reply to message */}
            {message.replyTo && (
              <div
                className={`p-2 rounded-xl border-l-3 text-[11px] flex items-start gap-1.5 ${
                  isOwn
                    ? 'bg-indigo-700/50 border-indigo-400 text-indigo-100'
                    : 'bg-slate-50 border-indigo-500 text-slate-600'
                }`}
              >
                <CornerDownRight className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold block text-[10px] opacity-80">
                    {message.replyTo.sender?.name}
                  </span>
                  <p className="truncate font-medium">
                    {message.replyTo.content || 'Media message'}
                  </p>
                </div>
              </div>
            )}

            {/* Voice note */}
            {isVoiceNote && message.mediaUrl && (
              <div
                className={`flex items-center gap-2 p-2 rounded-xl ${
                  isOwn ? 'bg-indigo-700/50' : 'bg-slate-50'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                  <Mic className="w-3.5 h-3.5" />
                </div>
                <audio src={message.mediaUrl} controls className="flex-1 h-8" />
              </div>
            )}

            {/* Image */}
            {isImage && message.mediaUrl && (
              <div className="overflow-hidden rounded-xl border border-slate-200/20 my-1 relative">
                <img
                  src={message.mediaUrl}
                  alt="attachment"
                  className="w-full max-h-60 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setShowFullImage(true)}
                />
                <button
                  onClick={() => window.open(message.mediaUrl!, '_blank')}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 hover:opacity-100 transition-opacity"
                >
                  <ImageIcon className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Video */}
            {isVideo && message.mediaUrl && (
              <div className="overflow-hidden rounded-xl my-1">
                <video
                  src={message.mediaUrl}
                  controls
                  className="w-full max-h-60 rounded-xl"
                  poster={message.thumbnailUrl}
                />
              </div>
            )}

            {/* Audio */}
            {isAudio && message.mediaUrl && (
              <div
                className={`flex items-center gap-2 p-2 rounded-xl ${
                  isOwn ? 'bg-indigo-700/50' : 'bg-slate-50'
                }`}
              >
                <Music className={`w-4 h-4 ${isOwn ? 'text-indigo-300' : 'text-indigo-500'}`} />
                <audio src={message.mediaUrl} controls className="flex-1 h-8" />
              </div>
            )}

            {/* File */}
            {message.fileUrl && (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noreferrer"
                className={`p-2 rounded-xl flex items-center gap-2 border text-xs font-semibold ${
                  isOwn
                    ? 'bg-indigo-700/50 border-indigo-500 text-indigo-100'
                    : 'bg-slate-50 border-slate-200 text-indigo-600'
                } hover:bg-slate-100 transition-colors`}
              >
                <File className="w-4 h-4 shrink-0" />
                <span className="truncate">View Attached File</span>
              </a>
            )}

            {/* Multiple attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-1.5">
                {message.attachments.map(renderAttachment)}
              </div>
            )}

            {/* Message content */}
            {message.content && (
              <div className="leading-relaxed font-medium whitespace-pre-wrap break-words">
                {message.content}
              </div>
            )}

            {/* Translation */}
            {translation && (
              <button
                onClick={() => setShowTranslation((v) => !v)}
                className={`flex items-center gap-1 text-[10px] font-semibold ${
                  isOwn ? 'text-indigo-300' : 'text-indigo-500'
                } hover:underline`}
              >
                <Languages className="w-3 h-3" />
                {showTranslation ? 'Hide translation' : 'See translation'}
              </button>
            )}
            
            {showTranslation && translation && (
              <div
                className={`text-[11px] italic pt-1 border-t ${
                  isOwn ? 'border-indigo-700 text-indigo-200' : 'border-slate-100 text-slate-500'
                }`}
              >
                {translation.translatedContent}
              </div>
            )}

            {/* Message footer */}
            <div className="flex items-center justify-end gap-2 text-[10px] font-semibold text-slate-400 mt-1">
              {message.isEdited && (
                <span className="flex items-center gap-0.5 opacity-70">
                  <Pencil className="w-2.5 h-2.5" />
                  edited
                </span>
              )}
              <span className="opacity-70" title={format(messageTime, 'PPpp')}>
                {timeStr}
              </span>
              <span className="text-[9px] text-slate-400 hidden group-hover:inline">
                {relativeTime}
              </span>
              {isOwn && <MessageStatus />}
            </div>
          </div>
        )}

        {/* Reaction badges */}
        {Object.keys(aggregatedReactions).length > 0 && (
          <div
            className={`flex items-center gap-1 mt-1 flex-wrap ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}
          >
            {Object.entries(aggregatedReactions).map(([emoji, { count, mine }]) => (
              <button
                key={emoji}
                onClick={() => handleReactionBadgeClick(emoji)}
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border shadow-sm text-[11px] font-bold transition-all hover:scale-105 ${
                  mine
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{emoji}</span>
                {count > 1 && (
                  <span className={`text-[10px] ${mine ? 'text-indigo-400' : 'text-slate-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selection checkbox - shown in selection mode */}
      {isSelectionMode && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected 
              ? 'bg-indigo-600 border-indigo-600' 
              : 'border-slate-300 bg-white'
          }`}>
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
      )}

      {/* Full image modal */}
      <AnimatePresence>
        {showFullImage && message.mediaUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={message.mediaUrl}
                alt="Full size"
                className="w-full h-full object-contain rounded-2xl"
              />
              <button
                onClick={() => setShowFullImage(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <button
                  onClick={() => window.open(message.mediaUrl!, '_blank')}
                  className="px-4 py-2 bg-black/50 text-white rounded-lg text-sm hover:bg-black/70 transition-colors"
                >
                  Download
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};