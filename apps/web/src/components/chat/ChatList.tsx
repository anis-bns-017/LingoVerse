import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Chat } from '../../hooks/useChat';
import { Users, User, Image as ImageIcon } from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
}) => {
  const { user } = useAuth();

  const getOtherParticipant = (chat: Chat) => {
    return chat.participants?.find((p) => p.userId !== user?.id)?.user;
  };

  const getChatName = (chat: Chat) => {
    if (chat.type === 'PRIVATE') {
      const otherUser = getOtherParticipant(chat);
      return otherUser?.name || 'Unknown User';
    }
    return chat.name || 'Group Chat';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'PRIVATE') {
      const otherUser = getOtherParticipant(chat);
      return otherUser?.avatarUrl;
    }
    return chat.avatarUrl;
  };

  const getLastMessage = (chat: Chat) => {
    if (chat.messages && chat.messages.length > 0) {
      const msg = chat.messages[0];
      if (msg.content) return msg.content;
      return (
        <span className="inline-flex items-center gap-1 text-slate-400">
          <ImageIcon className="w-3 h-3" /> Photo / Media
        </span>
      );
    }
    return 'No messages yet';
  };

  return (
    <div className="p-3 space-y-1.5 h-full overflow-y-auto custom-scrollbar">
      {chats.map((chat) => {
        const isSelected = selectedChatId === chat.id;
        const avatarUrl = getChatAvatar(chat);
        const name = getChatName(chat);
        const isGroup = chat.type !== 'PRIVATE';

        return (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`group relative p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 border ${
              isSelected
                ? 'bg-indigo-50/70 border-indigo-100 shadow-sm'
                : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-100'
            }`}
          >
            {/* Active Indicator Bar */}
            {isSelected && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-r-full" />
            )}

            {/* Avatar Section */}
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-100"
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-2xl font-bold text-base flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border-slate-200/60'
                  }`}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Chat Type Badge */}
              <div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] border shadow-xs ${
                  isGroup
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-500 border-slate-100'
                }`}
              >
                {isGroup ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
              </div>
            </div>

            {/* Text Details */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <h4
                  className={`font-bold text-xs truncate transition-colors ${
                    isSelected ? 'text-indigo-950' : 'text-slate-800'
                  }`}
                >
                  {name}
                </h4>
              </div>

              <div
                className={`text-xs truncate transition-colors ${
                  isSelected ? 'text-indigo-700/80 font-medium' : 'text-slate-400'
                }`}
              >
                {getLastMessage(chat)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};