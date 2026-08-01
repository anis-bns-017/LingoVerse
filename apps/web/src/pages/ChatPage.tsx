import React, { useState } from 'react';
import { useChats } from '../hooks/useChat';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { MessageSquare, ArrowLeft, MessagesSquare } from 'lucide-react';

export const ChatPage = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const { data: chats, isLoading } = useChats();

  if (isLoading) {
    return <ChatPageSkeleton />;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto h-[calc(100vh-112px)] min-h-[500px] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar Container */}
        <div
          className={`w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-100 bg-white flex flex-col shrink-0 ${
            selectedChatId ? 'hidden md:flex' : 'flex'
          } h-full`}
        >
          {/* Sidebar Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">
                  Messages
                </h1>
                <p className="text-[11px] font-semibold text-slate-400">
                  {chats?.length || 0} active conversations
                </p>
              </div>
            </div>
          </div>

          {/* Chat List Wrapper */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {chats && chats.length > 0 ? (
              <ChatList
                chats={chats}
                selectedChatId={selectedChatId || undefined}
                onSelectChat={setSelectedChatId}
              />
            ) : (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MessagesSquare className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  No conversations found
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Window Container */}
        <div
          className={`flex-1 bg-slate-50/30 flex flex-col h-full ${
            !selectedChatId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedChatId ? (
            <div className="flex flex-col h-full relative">
              {/* Mobile Back Button Bar */}
              <div className="md:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => setSelectedChatId(null)}
                  className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Chats</span>
                </button>
              </div>

              {/* Active Chat Component Container */}
              <div className="flex-1 overflow-hidden">
                <ChatWindow chatId={selectedChatId} />
              </div>
            </div>
          ) : (
            /* Empty Desktop View */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                <MessagesSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-lg font-bold text-slate-800">
                  Select a Conversation
                </h3>
                <p className="text-xs text-slate-500">
                  Choose a chat from the sidebar to view messages, practice languages, and stay connected.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// Skeleton Loading State
const ChatPageSkeleton = () => (
  <div className="min-h-[calc(100vh-64px)] bg-slate-50/50 p-4 sm:p-6 lg:p-8">
    <div className="max-w-7xl mx-auto h-[calc(100vh-112px)] min-h-[500px] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex">
      {/* Sidebar Skeleton */}
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-100 bg-white p-5 space-y-4 shrink-0 animate-pulse">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-slate-200" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-3 w-40 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Window Skeleton */}
      <div className="hidden md:flex flex-1 bg-slate-50/30 items-center justify-center p-8 animate-pulse">
        <div className="space-y-3 text-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-200 mx-auto" />
          <div className="h-5 w-48 bg-slate-200 rounded mx-auto" />
          <div className="h-3 w-64 bg-slate-100 rounded mx-auto" />
        </div>
      </div>
    </div>
  </div>
);