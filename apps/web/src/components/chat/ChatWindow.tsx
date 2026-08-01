import React, { useState, useRef, useEffect } from 'react';
import {
  useMessages,
  useSendMessage,
  useChat,
  useChatSocket,
  type Message,
} from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Reply, X, Users, User, Circle } from 'lucide-react';

interface ChatWindowProps {
  chatId: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const { user } = useAuth();
  const { data: chat } = useChat(chatId);
  const { data: messages, refetch } = useMessages(chatId);
  const sendMessage = useSendMessage();
  const { newMessage, typingUsers, onlineUsers, sendTyping } = useChatSocket(
    chatId,
    user?.id || ''
  );
  const [isTypingState, setIsTypingState] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, newMessage]);

  // Update messages when a new socket message arrives
  useEffect(() => {
    if (newMessage) {
      refetch();
    }
  }, [newMessage, refetch]);

  const handleSend = async (
    content: string,
    type?: string,
    mediaUrl?: string,
    fileUrl?: string
  ) => {
    if (!content.trim() && !mediaUrl) return;
    try {
      await sendMessage.mutateAsync({
        chatId,
        content,
        type: type || 'TEXT',
        mediaUrl,
        fileUrl,
        replyToId: replyTo?.id,
      });
      setReplyTo(null);
    } catch {
      // Handled by mutation toast/error handler
    }
  };

  // Fixed typing comparison bug (previously: isTyping !== isTyping)
  const handleTyping = (typingStatus: boolean) => {
    if (typingStatus !== isTypingState) {
      setIsTypingState(typingStatus);
      sendTyping(typingStatus);
    }
  };

  const getOtherParticipant = () => {
    if (!chat || chat.type !== 'PRIVATE') return null;
    return chat.participants.find((p) => p.userId !== user?.id)?.user;
  };

  const getChatName = () => {
    if (!chat) return 'Loading conversation...';
    if (chat.type === 'PRIVATE') {
      const other = getOtherParticipant();
      return other?.name || 'Unknown User';
    }
    return chat.name || 'Group Chat';
  };

  const getChatAvatar = () => {
    if (!chat) return null;
    if (chat.type === 'PRIVATE') {
      return getOtherParticipant()?.avatarUrl;
    }
    return chat.avatarUrl;
  };

  const otherUser = getOtherParticipant();
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const isGroup = chat?.type !== 'PRIVATE';

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          {/* Avatar Header */}
          <div className="relative">
            {getChatAvatar() ? (
              <img
                src={getChatAvatar()!}
                alt={getChatName()}
                className="w-10 h-10 rounded-2xl object-cover border border-slate-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 text-indigo-600 font-bold text-sm flex items-center justify-center border border-slate-100">
                {getChatName().charAt(0).toUpperCase()}
              </div>
            )}

            {!isGroup && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
            )}
          </div>

          <div>
            <h2 className="font-bold text-sm text-slate-800 leading-snug">
              {getChatName()}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px]">
              {isGroup ? (
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Users className="w-3 h-3" /> {chat?.participants?.length || 0} members
                </span>
              ) : isOnline ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                  Online
                </span>
              ) : (
                <span className="text-slate-400 font-medium">Offline</span>
              )}
            </div>
          </div>
        </div>

        {/* Live Typing Indicator in Header */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50/80 text-indigo-600 rounded-full text-xs font-semibold animate-pulse">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
            </span>
            <span className="hidden sm:inline">Someone is typing...</span>
          </div>
        )}
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages && messages.length > 0 ? (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === user?.id}
              onReply={() => setReplyTo(msg)}
              onReact={() => {
                /* Handled by bubble */
              }}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
              {isGroup ? <Users className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <p className="text-xs font-semibold text-slate-500">
              No messages yet. Send a greeting to start chatting!
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner Preview */}
      {replyTo && (
        <div className="mx-4 mb-2 p-3 bg-white rounded-2xl border-l-4 border-indigo-500 border-y border-r border-slate-100 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Reply className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Replying to message
              </p>
              <p className="text-xs text-slate-600 truncate font-medium">
                {replyTo.content || 'Media attachment'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer Message Input Container */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        <MessageInput onSend={handleSend} onTyping={handleTyping} />
      </div>
    </div>
  );
};