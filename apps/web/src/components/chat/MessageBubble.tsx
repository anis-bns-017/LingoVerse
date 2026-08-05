import React, { useState } from 'react';
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
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
}

const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onReply,
  onReact,
}) => {
  const { user } = useAuth();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

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

  const handleReactionBadgeClick = (emoji: string) => {
    // Backend toggles: clicking the same emoji you already reacted with removes it.
    onReact?.(emoji);
  };

  const renderAttachment = (att: { id: string; url: string; type: string; filename: string }) => {
    switch (att.type) {
      case 'IMAGE':
        return (
          <img
            key={att.id}
            src={att.url}
            alt={att.filename}
            className="w-full max-h-60 object-cover rounded-2xl"
          />
        );
      case 'VIDEO':
        return (
          <video key={att.id} src={att.url} controls className="w-full max-h-60 rounded-2xl" />
        );
      case 'AUDIO':
        return (
          <div
            key={att.id}
            className={`flex items-center gap-2 p-2.5 rounded-2xl ${
              isOwn ? 'bg-slate-800/80' : 'bg-slate-50'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
              <Play className="w-3.5 h-3.5 ml-0.5" />
            </div>
            <audio src={att.url} controls className="flex-1 h-8" />
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
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{att.filename || 'View file'}</span>
          </a>
        );
    }
  };

  const isVoiceNote = message.type === 'VOICE_NOTE';
  const isSticker = message.type === 'STICKER';

  return (
    <div
      className={`group relative flex items-end gap-2 my-1 ${
        isOwn ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {!isOwn && (
        <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-100">
          {message.sender?.avatarUrl ? (
            <img
              src={message.sender.avatarUrl}
              alt={message.sender.name}
              className="w-full h-full rounded-xl object-cover"
            />
          ) : (
            message.sender?.name?.charAt(0).toUpperCase() || 'U'
          )}
        </div>
      )}

      <div className="relative max-w-[80%] sm:max-w-[70%]">
        {/* Hover action bar */}
        <div
          className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center gap-1 bg-white border border-slate-100 shadow-md rounded-xl p-1 ${
            isOwn ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
          }`}
        >
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
            title="React"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onReply}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
        </div>

        {showEmojiPicker && (
          <div
            className={`absolute z-20 bottom-full mb-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-lg flex items-center gap-1 animate-in fade-in zoom-in-95 duration-100 ${
              isOwn ? 'right-0' : 'left-0'
            }`}
          >
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact?.(emoji);
                  setShowEmojiPicker(false);
                }}
                className="hover:scale-125 p-1 rounded-lg text-base transition-transform active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Sticker renders bare, no bubble chrome — matches WhatsApp/HelloTalk sticker style */}
        {isSticker && message.mediaUrl ? (
          <img src={message.mediaUrl} alt="sticker" className="w-28 h-28 object-contain" />
        ) : (
          <div
            className={`p-3.5 rounded-3xl text-xs space-y-1.5 shadow-2xs ${
              isOwn
                ? 'bg-slate-900 text-white rounded-br-xs'
                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-xs'
            }`}
          >
            {!isOwn && (
              <div className="font-bold text-[11px] text-indigo-600">{message.sender?.name}</div>
            )}

            {message.replyTo && (
              <div
                className={`p-2 rounded-2xl border-l-3 text-[11px] flex items-start gap-1.5 ${
                  isOwn
                    ? 'bg-slate-800/80 border-indigo-400 text-slate-300'
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
                className={`flex items-center gap-2 p-2 rounded-2xl ${
                  isOwn ? 'bg-slate-800/80' : 'bg-slate-50'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                  <Mic className="w-3.5 h-3.5" />
                </div>
                <audio src={message.mediaUrl} controls className="flex-1 h-8" />
              </div>
            )}

            {/* Legacy single mediaUrl (non-voice-note, non-sticker) — image by default */}
            {!isVoiceNote && !isSticker && message.mediaUrl && (
              <div className="overflow-hidden rounded-2xl border border-slate-200/20 my-1">
                <img
                  src={message.mediaUrl}
                  alt="attachment"
                  className="w-full max-h-60 object-cover rounded-2xl"
                />
              </div>
            )}

            {message.fileUrl && (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noreferrer"
                className={`p-2 rounded-xl flex items-center gap-2 border text-xs font-semibold ${
                  isOwn
                    ? 'bg-slate-800 border-slate-700 text-indigo-300'
                    : 'bg-slate-50 border-slate-200 text-indigo-600'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate">View Attached File</span>
              </a>
            )}

            {/* Multiple attachments, type-aware */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-1.5">
                {message.attachments.map(renderAttachment)}
              </div>
            )}

            {message.content && (
              <div className="leading-relaxed font-medium whitespace-pre-wrap break-words">
                {message.content}
              </div>
            )}

            {/* Translation toggle — surfaces MessageTranslation, previously unused */}
            {translation && (
              <button
                onClick={() => setShowTranslation((v) => !v)}
                className={`flex items-center gap-1 text-[10px] font-semibold ${
                  isOwn ? 'text-indigo-300' : 'text-indigo-500'
                }`}
              >
                <Languages className="w-3 h-3" />
                {showTranslation ? 'Hide translation' : 'See translation'}
              </button>
            )}
            {showTranslation && translation && (
              <div
                className={`text-[11px] italic pt-1 border-t ${
                  isOwn ? 'border-slate-700 text-slate-300' : 'border-slate-100 text-slate-500'
                }`}
              >
                {translation.translatedContent}
              </div>
            )}

            <div className="flex items-center justify-end gap-1 text-[10px] font-semibold text-slate-400">
              {message.isEdited && (
                <span className="flex items-center gap-0.5 opacity-70">
                  <Pencil className="w-2.5 h-2.5" />
                  edited
                </span>
              )}
              <span>
                {message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : ''}
              </span>
              {/* Single check = sent. True double-check "read" status needs the
                  backend's getMessages to include readReceipts — see note below. */}
              {isOwn && <Check className="w-3 h-3 text-indigo-400" />}
            </div>
          </div>
        )}

        {/* Reaction badges — clickable to toggle your own reaction, highlighted if yours */}
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
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border shadow-2xs text-[11px] font-bold transition-colors ${
                  mine
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-100 text-slate-700'
                }`}
              >
                <span>{emoji}</span>
                {count > 1 && (
                  <span className={mine ? 'text-[10px] text-indigo-400' : 'text-[10px] text-slate-400'}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};