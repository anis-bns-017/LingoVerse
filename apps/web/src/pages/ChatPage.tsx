import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useChats } from "../hooks/useChat";
import { ChatList } from "../components/chat/ChatList";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ChatWindow } from "../components/chat/ChatWindow";
import {
  MessageSquare,
  ArrowLeft,
  MessagesSquare,
  Plus,
  Search,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const ChatPage = () => {
  const { user } = useAuth();
  const { chatId: urlChatId } = useParams<{ chatId?: string }>();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: chats, isLoading } = useChats();
  const location = useLocation();
  const navigate = useNavigate();

  const hasSelection = useMemo(
    () => !!(selectedChatId || selectedCommunityId),
    [selectedChatId, selectedCommunityId]
  );

  // Sync selection from URL
  const updateFromUrl = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const chatId = params.get("chatId");
    const communityId = params.get("communityId");

    if (chatId) {
      setSelectedChatId(chatId);
      setSelectedCommunityId(null);
    } else if (communityId) {
      setSelectedCommunityId(communityId);
      setSelectedChatId(null);
    } else if (urlChatId) {
      setSelectedChatId(urlChatId);
      setSelectedCommunityId(null);
    }
  }, [location.search, urlChatId]);

  useEffect(() => {
    updateFromUrl();
  }, [updateFromUrl]);

  // Filter chats (single source of truth)
  const filteredChats = useMemo(() => {
    if (!chats) return [];

    if (!searchQuery.trim()) return chats;

    const q = searchQuery.toLowerCase();

    return chats.filter((chat) => {
      if (chat.name?.toLowerCase().includes(q)) return true;

      if (chat.type === "PRIVATE") {
        const other = chat.participants.find((p) => p.userId !== user?.id);
        if (other?.user.name.toLowerCase().includes(q)) return true;
      }

      return false;
    });
  }, [chats, searchQuery, user?.id]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      setSelectedChatId(chatId);
      setSelectedCommunityId(null);
      navigate(`?chatId=${chatId}`, { replace: true });
    },
    [navigate]
  );

  const handleSelectCommunity = useCallback(
    (communityId: string) => {
      setSelectedCommunityId(communityId);
      setSelectedChatId(null);
      navigate(`?communityId=${communityId}`, { replace: true });
    },
    [navigate]
  );

  const handleBack = useCallback(() => {
    setSelectedChatId(null);
    setSelectedCommunityId(null);
    navigate("", { replace: true });
  }, [navigate]);

  const handleCreateNewChat = useCallback(() => {
    navigate("/chat/new");
  }, [navigate]);

  // ─── Chat window content ─────────────────────────────────────────────────
  const chatWindowContent = useMemo(() => {
    if (selectedChatId) {
      return (
        <div className="flex flex-col h-full">
          {/* Mobile back bar */}
          <div className="md:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Chats
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatWindow key={selectedChatId} chatId={selectedChatId} onBack={handleBack} />
          </div>
        </div>
      );
    }

    if (selectedCommunityId) {
      return (
        <div className="flex flex-col h-full">
          <div className="md:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Chats
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatWindow
              key={selectedCommunityId}
              communityId={selectedCommunityId}
              onBack={handleBack}
            />
          </div>
        </div>
      );
    }

    // Empty state (desktop)
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
          <MessagesSquare className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-lg font-bold text-slate-800">Select a Conversation</h3>
          <p className="text-xs text-slate-500">
            Choose a chat from the sidebar to view messages and stay connected.
          </p>
        </div>
        <button
          onClick={handleCreateNewChat}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
      </div>
    );
  }, [selectedChatId, selectedCommunityId, handleBack, handleCreateNewChat]);

  if (isLoading) {
    return <ChatPageSkeleton />;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto h-[calc(100vh-112px)] min-h-[500px] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* ── Sidebar (single source of truth for header + search + +) ── */}
        <div
          className={`w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-100 bg-white flex flex-col shrink-0 ${
            hasSelection ? "hidden md:flex" : "flex"
          } h-full`}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-800 truncate">Messages</h1>
                <p className="text-[11px] font-semibold text-slate-400">
                  {filteredChats.length} active conversation{filteredChats.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateNewChat}
              className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm shrink-0"
              title="New Conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search (only one place) */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Pure list – ChatList should NOT contain its own search or + button */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredChats.length > 0 ? (
              <ChatList
                chats={filteredChats}
                selectedChatId={selectedChatId || undefined}
                onSelectChat={handleSelectChat}
                onSelectCommunity={handleSelectCommunity}
              />
            ) : (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  {searchQuery ? <Search className="w-6 h-6" /> : <MessagesSquare className="w-6 h-6" />}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  {searchQuery ? "No conversations match your search" : "No conversations yet"}
                </p>
                {!searchQuery && (
                  <button
                    onClick={handleCreateNewChat}
                    className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    Start a new conversation →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Main chat area ── */}
        <div
          className={`flex-1 bg-slate-50/30 flex flex-col h-full ${
            !hasSelection ? "hidden md:flex" : "flex"
          }`}
        >
          {chatWindowContent}
        </div>
      </div>
    </div>
  );
};

// Skeleton
const ChatPageSkeleton = () => (
  <div className="min-h-[calc(100vh-64px)] bg-slate-50/50 p-4 sm:p-6 lg:p-8">
    <div className="max-w-7xl mx-auto h-[calc(100vh-112px)] min-h-[500px] bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex">
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-100 bg-white p-5 space-y-4 shrink-0 animate-pulse">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-slate-200" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="h-10 bg-slate-100 rounded-xl" />
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