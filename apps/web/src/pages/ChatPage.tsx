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
  Sparkles,
  Users,
  Bell,
  BellOff,
  Settings,
  HelpCircle,
  Keyboard,
  Moon,
  Sun,
  LogOut,
  User,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  Home,
  Hash,
  Pin,
  Star,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export const ChatPage = () => {
  const { user } = useAuth();
  const { chatId: urlChatId } = useParams<{ chatId?: string }>();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { data: chats, isLoading } = useChats();
  const location = useLocation();
  const navigate = useNavigate();

  const hasSelection = useMemo(
    () => !!(selectedChatId || selectedCommunityId),
    [selectedChatId, selectedCommunityId],
  );

  // Sync selection from URL
  useEffect(() => {
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
    } else {
      setSelectedChatId(null);
      setSelectedCommunityId(null);
    }
  }, [location.search, urlChatId]);

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter((chat) => {
      if (chat.name?.toLowerCase().includes(q)) return true;
      if (chat.type === "PRIVATE") {
        const other = chat.participants?.find((p) => p.userId !== user?.id);
        if (other?.user?.name?.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [chats, searchQuery, user?.id]);

  const pinnedChats = useMemo(() => {
    return filteredChats.filter((chat) => chat.isPinned);
  }, [filteredChats]);

  const recentChats = useMemo(() => {
    return filteredChats
      .filter((chat) => !chat.isPinned)
      .sort((a, b) => {
        const dateA = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(0);
        const dateB = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [filteredChats]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      setSelectedChatId(chatId);
      setSelectedCommunityId(null);
      navigate(`?chatId=${chatId}`, { replace: true });
    },
    [navigate],
  );

  const handleBack = useCallback(() => {
    setSelectedChatId(null);
    setSelectedCommunityId(null);
    navigate(".", { replace: true });
  }, [navigate]);

  const handleCreateNewChat = useCallback(() => {
    navigate("/chat/new");
  }, [navigate]);

  const handleToggleNotifications = useCallback(() => {
    toast.success(isSidebarCollapsed ? "Notifications enabled" : "Notifications disabled");
    setIsSidebarCollapsed(!isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  const quickActions = [
    { icon: User, label: "New Chat", action: handleCreateNewChat, color: "indigo" },
    { icon: Users, label: "New Group", action: () => toast.info("Group creation coming soon"), color: "violet" },
    { icon: Hash, label: "Join Channel", action: () => toast.info("Channel joining coming soon"), color: "pink" },
    { icon: Star, label: "Saved Messages", action: () => toast.info("Saved messages coming soon"), color: "amber" },
  ];

  if (isLoading) return <ChatPageSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-slate-50/80 to-indigo-50/30 p-3 sm:p-4 lg:p-6"
    >
      <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] min-h-[500px] bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl shadow-indigo-500/5 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar */}
        <motion.div
          layout
          className={`w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200/50 bg-white/50 backdrop-blur-sm flex flex-col shrink-0 transition-all ${
            hasSelection ? "hidden md:flex" : "flex"
          } h-full`}
        >
          {/* Sidebar Header */}
          <div className="p-5 border-b border-slate-200/50 flex items-center justify-between gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 min-w-0"
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-800 truncate flex items-center gap-2">
                  Messages
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </h1>
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {filteredChats.length} active conversation
                  {filteredChats.length !== 1 ? "s" : ""}
                </p>
              </div>
            </motion.div>
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={handleToggleNotifications}
                className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                title={isSidebarCollapsed ? "Enable notifications" : "Disable notifications"}
              >
                {isSidebarCollapsed ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={handleCreateNewChat}
                className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                title="New Conversation"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-slate-200/50">
            <motion.div
              animate={{ scale: isSearchFocused ? 1.01 : 1 }}
              className="relative"
            >
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                isSearchFocused ? "text-indigo-500" : "text-slate-400"
              }`} />
              <input
                type="text"
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white placeholder:text-slate-400"
              />
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </motion.div>
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-2 border-b border-slate-200/50">
            <div className="flex items-center gap-1">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  type="button"
                  onClick={action.action}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all bg-${action.color}-50 text-${action.color}-600 hover:bg-${action.color}-100`}
                >
                  <action.icon className={`w-3.5 h-3.5 text-${action.color}-500`} />
                  {action.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredChats.length > 0 ? (
              <>
                {/* Pinned Chats */}
                {pinnedChats.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-1.5 flex items-center gap-2">
                      <Pin className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pinned</span>
                    </div>
                    <ChatList
                      chats={pinnedChats}
                      selectedChatId={selectedChatId || undefined}
                      onSelectChat={handleSelectChat}
                      isPinned
                    />
                  </div>
                )}

                {/* Recent Chats */}
                {recentChats.length > 0 && (
                  <div className="py-2">
                    {pinnedChats.length > 0 && (
                      <div className="px-4 py-1.5 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recent</span>
                      </div>
                    )}
                    <ChatList
                      chats={recentChats}
                      selectedChatId={selectedChatId || undefined}
                      onSelectChat={handleSelectChat}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center space-y-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 20 }}
                  className="w-16 h-16 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 flex items-center justify-center mx-auto"
                >
                  {searchQuery ? (
                    <Search className="w-7 h-7" />
                  ) : (
                    <MessagesSquare className="w-7 h-7" />
                  )}
                </motion.div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-600">
                    {searchQuery
                      ? "No conversations match your search"
                      : "Start a new conversation"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {searchQuery
                      ? "Try adjusting your search terms"
                      : "Connect with friends and colleagues"}
                  </p>
                </div>
                {!searchQuery && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleCreateNewChat}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    New Conversation
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200/50 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/20">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => toast.info("Settings coming soon")}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => toast.info("Keyboard shortcuts: Cmd+K to search")}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Keyboard className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          layout
          className={`flex-1 bg-gradient-to-br from-slate-50/30 to-indigo-50/20 flex flex-col h-full ${
            !hasSelection ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedChatId ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex flex-col h-full"
            >
              <div className="md:hidden bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 py-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-xs font-bold">Back</span>
                </button>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => toast.info("Chat info")}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  >
                    <User className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatWindow
                  key={selectedChatId}
                  chatId={selectedChatId}
                  onBack={handleBack}
                />
              </div>
            </motion.div>
          ) : selectedCommunityId ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="flex flex-col h-full"
            >
              <div className="md:hidden bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 py-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-xs font-bold">Back</span>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatWindow
                  key={selectedCommunityId}
                  communityId={selectedCommunityId}
                  onBack={handleBack}
                />
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 20 }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/10">
                  <MessagesSquare className="w-10 h-10" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg"
                />
              </motion.div>

              <div className="space-y-2 max-w-sm">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Welcome to Messages
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Select a conversation from the sidebar to start chatting,
                  or create a new one to connect with someone.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleCreateNewChat}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Conversation
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => toast.info("Explore communities coming soon")}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-2xl hover:border-slate-300 hover:shadow-md transition-all"
                >
                  <Users className="w-4 h-4" />
                  Explore Communities
                </motion.button>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-6 pt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">
                    {filteredChats.length}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">Chats</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">12</p>
                  <p className="text-[10px] font-medium text-slate-400">Online</p>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-indigo-600">8</p>
                  <p className="text-[10px] font-medium text-slate-400">Unread</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

const ChatPageSkeleton = () => (
  <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-slate-50/80 to-indigo-50/30 p-3 sm:p-4 lg:p-6">
    <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] min-h-[500px] bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl shadow-indigo-500/5 overflow-hidden flex">
      <div className="w-full md:w-80 lg:w-96 border-r border-slate-200/50 bg-white/50 backdrop-blur-sm p-5 space-y-4 animate-pulse">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200/50">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-200 to-violet-200" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-24 bg-slate-200 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-200" />
        </div>

        {/* Search */}
        <div className="h-11 bg-slate-100 rounded-xl" />

        {/* Quick Actions */}
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-8 bg-slate-100 rounded-lg" />
          ))}
        </div>

        {/* Chat Items */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-3 w-40 bg-slate-100 rounded" />
            </div>
            <div className="w-5 h-5 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Empty State */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-slate-50/30 to-indigo-50/20 items-center justify-center p-8">
        <div className="space-y-4 text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-200 to-slate-300 mx-auto" />
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 rounded mx-auto" />
            <div className="h-4 w-64 bg-slate-100 rounded mx-auto" />
          </div>
          <div className="flex gap-3 justify-center">
            <div className="h-12 w-36 bg-slate-200 rounded-2xl" />
            <div className="h-12 w-36 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// X icon component (if not imported)
const X = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);