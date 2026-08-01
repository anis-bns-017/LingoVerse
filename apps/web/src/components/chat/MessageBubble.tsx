import React, { useState } from 'react';
import { format } from 'date-fns';
import type { Message } from '../../hooks/useChat';
import { Reply, Smile, CheckCheck, FileText, CornerDownRight } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  onReply,
  onReact,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  // Aggregate reactions count (e.g. ❤️ x2)
  const aggregatedReactions = message.reactions?.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div
      className={`group relative flex items-end gap-2 my-1 ${
        isOwn ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Sender Avatar for incoming messages */}
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

      {/* Bubble Container */}
      <div className="relative max-w-[80%] sm:max-w-[70%]">
        {/* Quick Action Overlay (Hover Bar) */}
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

        {/* Emoji Popover */}
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

        {/* Bubble Body */}
        <div
          className={`p-3.5 rounded-3xl text-xs space-y-1.5 shadow-2xs ${
            isOwn
              ? 'bg-slate-900 text-white rounded-br-xs'
              : 'bg-white text-slate-800 border border-slate-100 rounded-bl-xs'
          }`}
        >
          {/* Sender Name (Group Context) */}
          {!isOwn && (
            <div className="font-bold text-[11px] text-indigo-600">
              {message.sender?.name}
            </div>
          )}

          {/* Quoted Reply Content */}
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

          {/* Media Attachments */}
          {message.mediaUrl && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/20 my-1">
              <img
                src={message.mediaUrl}
                alt="attachment"
                className="w-full max-h-60 object-cover rounded-2xl"
              />
            </div>
          )}

          {/* File Attachment */}
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

          {/* Text Message Content */}
          {message.content && (
            <div className="leading-relaxed font-medium whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {/* Timestamp and Read Status */}
          <div
            className={`flex items-center justify-end gap-1 text-[10px] font-semibold ${
              isOwn ? 'text-slate-400' : 'text-slate-400'
            }`}
          >
            <span>
              {message.createdAt
                ? format(new Date(message.createdAt), 'HH:mm')
                : ''}
            </span>
            {isOwn && <CheckCheck className="w-3 h-3 text-indigo-400" />}
          </div>
        </div>

        {/* Reaction Badges Container */}
        {aggregatedReactions && Object.keys(aggregatedReactions).length > 0 && (
          <div
            className={`flex items-center gap-1 mt-1 flex-wrap ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}
          >
            {Object.entries(aggregatedReactions).map(([emoji, count]) => (
              <span
                key={emoji}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white border border-slate-100 shadow-2xs text-[11px] font-bold text-slate-700"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-[10px] text-slate-400">{count}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};