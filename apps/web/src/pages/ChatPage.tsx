import React, { useState } from 'react';
import { useChats } from '../hooks/useChat';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';

export const ChatPage = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const { data: chats, isLoading } = useChats();

  if (isLoading) {
    return <div className="p-6">Loading chats...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-80 border-r bg-white overflow-hidden">
        <div className="p-3 border-b">
          <h2 className="text-lg font-semibold">Chats</h2>
        </div>
        {chats && (
          <ChatList
            chats={chats}
            selectedChatId={selectedChatId || undefined}
            onSelectChat={setSelectedChatId}
          />
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-gray-50">
        {selectedChatId ? (
          <ChatWindow chatId={selectedChatId} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
};