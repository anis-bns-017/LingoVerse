import React from 'react';
import { Chat } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat }) => {
  const { user } = useAuth();

  const getChatName = (chat: Chat) => {
    if (chat.type === 'PRIVATE') {
      const other = chat.participants.find((p) => p.userId !== user?.id);
      return other?.user.name || 'Unknown';
    }
    return chat.name || 'Group Chat';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'PRIVATE') {
      const other = chat.participants.find((p) => p.userId !== user?.id);
      return other?.user.avatarUrl;
    }
    return chat.avatarUrl;
  };

  const getLastMessage = (chat: Chat) => {
    if (chat.messages && chat.messages.length > 0) {
      const msg = chat.messages[0];
      return msg.content || 'Media message';
    }
    return 'No messages yet';
  };

  return (
    <div className="h-full overflow-y-auto">
      {chats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => onSelectChat(chat.id)}
          className={`p-3 border-b cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${
            selectedChatId === chat.id ? 'bg-blue-50' : ''
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold flex-shrink-0">
            {getChatAvatar(chat) ? (
              <img src={getChatAvatar(chat)} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              getChatName(chat).charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{getChatName(chat)}</div>
            <div className="text-sm text-gray-500 truncate">{getLastMessage(chat)}</div>
          </div>
        </div>
      ))}
    </div>
  );
};