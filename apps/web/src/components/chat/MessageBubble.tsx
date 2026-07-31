import React, { useState } from 'react';
import { Message } from '../../hooks/useChat';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, onReply, onReact }) => {
  const [showReactions, setShowReactions] = useState(false);
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '👏'];

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isOwn ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} rounded-lg p-3 shadow-sm`}>
        {!isOwn && (
          <div className="text-xs font-semibold text-gray-600 mb-1">
            {message.sender.name}
          </div>
        )}
        {message.replyTo && (
          <div className="text-xs bg-gray-100 p-1 rounded mb-1 border-l-2 border-blue-400">
            <span className="text-gray-500">↳ {message.replyTo.sender.name}:</span> {message.replyTo.content}
          </div>
        )}
        <div>{message.content}</div>
        <div className="flex justify-between items-center mt-1">
          <div className="text-xs opacity-70">
            {format(new Date(message.createdAt), 'HH:mm')}
          </div>
          <div className="flex gap-1">
            {message.reactions.length > 0 && (
              <div className="flex gap-1 text-xs">
                {message.reactions.map((r) => (
                  <span key={r.id} className="bg-gray-300 bg-opacity-30 px-1 rounded">
                    {r.emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Reactions popup */}
        <div className="flex gap-1 mt-2">
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact?.(emoji)}
              className="text-sm hover:bg-gray-300 p-1 rounded"
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-1 text-xs">
          <button onClick={onReply} className="hover:underline">Reply</button>
        </div>
      </div>
    </div>
  );
};