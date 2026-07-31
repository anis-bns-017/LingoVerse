import React, { useState, useRef, useEffect } from 'react';
import { useMessages, useSendMessage, useChat, useChatSocket, Message } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

interface ChatWindowProps {
  chatId: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const { user } = useAuth();
  const { data: chat } = useChat(chatId);
  const { data: messages, refetch } = useMessages(chatId);
  const sendMessage = useSendMessage();
  const { newMessage, typingUsers, onlineUsers, sendTyping, emitRead } = useChatSocket(chatId, user?.id || '');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, newMessage]);

  // Update messages when new message arrives
  useEffect(() => {
    if (newMessage) {
      refetch();
    }
  }, [newMessage, refetch]);

  const handleSend = async (content: string, type?: string, mediaUrl?: string, fileUrl?: string) => {
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
    } catch (error) {
      // error handled by mutation
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (isTyping !== isTyping) {
      setIsTyping(isTyping);
      sendTyping(isTyping);
    }
  };

  const getChatName = () => {
    if (!chat) return 'Loading...';
    if (chat.type === 'PRIVATE') {
      const other = chat.participants.find((p) => p.userId !== user?.id);
      return other?.user.name || 'Unknown';
    }
    return chat.name || 'Group Chat';
  };

  const getOtherUserId = () => {
    if (!chat || chat.type !== 'PRIVATE') return null;
    const other = chat.participants.find((p) => p.userId !== user?.id);
    return other?.userId || null;
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.has(userId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-3 flex items-center gap-3">
        <div className="font-semibold">{getChatName()}</div>
        {chat?.type === 'PRIVATE' && (
          <div className="text-sm text-gray-500">
            {getOtherUserId() && isUserOnline(getOtherUserId()!) ? (
              <span className="text-green-500">● Online</span>
            ) : (
              <span className="text-gray-400">● Offline</span>
            )}
          </div>
        )}
        {typingUsers.size > 0 && (
          <div className="text-sm text-gray-500 ml-auto">Someone is typing...</div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages?.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === user?.id}
            onReply={() => setReplyTo(msg)}
            onReact={(emoji) => {/* handle reaction */}}
          />
        ))}
        {replyTo && (
          <div className="bg-gray-100 p-2 rounded border-l-4 border-blue-500 flex justify-between items-center text-sm">
            <div>
              <span className="font-semibold">Replying to:</span> {replyTo.content}
            </div>
            <button onClick={() => setReplyTo(null)} className="text-red-500">✕</button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} onTyping={handleTyping} />
    </div>
  );
};