import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  useMessages,
  useCommunityMessages,
  useSendMessage,
  useSendCommunityMessage,
  useChat,
  useChatSocket,
  useDeleteMessage,
  useEditMessage,
  usePinMessage,
  type Message,
} from "../../hooks/useChat";
import { useAuth } from "../../contexts/AuthContext";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import {
  Reply,
  X,
  Users,
  Circle,
  Mic,
  Loader2,
  MoreVertical,
  Search,
  Pin,
  PinOff,
  Phone,
  Video,
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
  Edit,
  Flag,
  Forward,
  MessageCircle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface ChatWindowProps {
  chatId?: string;
  communityId?: string;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  communityId,
  onBack,
}) => {
  const { user } = useAuth();
  const isCommunity = !!communityId;
  const targetId = chatId || communityId || "";

  // ─── State ───────────────────────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showMessageActions, setShowMessageActions] = useState<string | null>(
    null,
  );
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // ─── Refs ────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastReadIdRef = useRef<string | null>(null);
  const searchHighlightRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);

  // ─── Data ────────────────────────────────────────────────────────────────
  const { data: chat } = useChat(chatId || "");
  const {
    data: chatMessages,
    isLoading: isLoadingChat,
    fetchNextPage,
    hasNextPage,
  } = useMessages(chatId || "");
  const {
    data: communityMessages,
    isLoading: isLoadingCommunity,
    fetchNextPage: fetchNextCommunityPage,
    hasNextPage: hasNextCommunityPage,
  } = useCommunityMessages(communityId || "");

  const rawMessages = isCommunity ? communityMessages : chatMessages;
  const isLoading = isCommunity ? isLoadingCommunity : isLoadingChat;
  const hasMore = isCommunity ? hasNextCommunityPage : hasNextPage;

  // Oldest → newest (latest at bottom)
  const messages = useMemo(() => {
    if (!rawMessages?.length) return [];
    return [...rawMessages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [rawMessages]);

  const sendMessageRest = useSendMessage();
  const sendCommunityMessageRest = useSendCommunityMessage();
  const deleteMessageMutation = useDeleteMessage();
  const editMessageMutation = useEditMessage();
  const pinMessageMutation = usePinMessage();

  // Keep scroll position flag in a ref so socket callback stays stable
  useEffect(() => {
    isNearBottomRef.current = isNearBottom;
  }, [isNearBottom]);

  const onNewMessage = useCallback(() => {
    if (isNearBottomRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } else {
      toast.info("New message", { duration: 2000 });
    }
  }, []);

  // Stable options object — prevents reconnect loops
  const socketOptions = useMemo(() => ({ onNewMessage }), [onNewMessage]);

  const {
    socket,
    isConnected,
    typingUsers,
    onlineUsers,
    sendMessage: sendSocketMessage,
    sendTyping,
    emitRead,
    deleteMessage: deleteSocketMessage,
    editMessage: editSocketMessage,
    pinMessage: pinSocketMessage,
  } = useChatSocket(targetId, user?.id || "", socketOptions);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const chatName = useMemo(() => {
    if (isCommunity) return "Community Chat";
    if (!chat) return "Loading…";
    if (chat.type === "PRIVATE") {
      const other = chat.participants.find((p) => p.userId !== user?.id)?.user;
      return other?.name || "Unknown";
    }
    return chat.name || "Group Chat";
  }, [chat, isCommunity, user?.id]);

  const chatAvatar = useMemo(() => {
    if (isCommunity || !chat) return null;
    if (chat.type === "PRIVATE") {
      return chat.participants.find((p) => p.userId !== user?.id)?.user
        ?.avatarUrl;
    }
    return chat.avatarUrl;
  }, [chat, isCommunity, user?.id]);

  const otherUser =
    !isCommunity && chat?.type === "PRIVATE"
      ? chat.participants.find((p) => p.userId !== user?.id)?.user
      : null;
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const isGroup = !isCommunity && chat?.type !== "PRIVATE";

  // ─── Search ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim() || !messages) {
      setSearchResults([]);
      setSearchIndex(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = messages.filter((m) =>
      m.content?.toLowerCase().includes(q),
    );
    setSearchResults(results);
    setSearchIndex(0);
  }, [searchQuery, messages]);

  useEffect(() => {
    if (searchResults.length === 0 || !searchHighlightRef.current) return;
    searchHighlightRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [searchIndex, searchResults]);

  // ─── Scroll ──────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    if (isNearBottom) scrollToBottom(messages.length > 5);
  }, [messages.length, isNearBottom, scrollToBottom]);

  useEffect(() => {
    if (!messages?.length || !user?.id) return;
    const last = messages[messages.length - 1];
    if (last.senderId === user.id || lastReadIdRef.current === last.id) return;
    lastReadIdRef.current = last.id;
    emitRead?.(last.id);
  }, [messages, user?.id, emitRead]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom);

    if (scrollTop < 80 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      const prevHeight = scrollHeight;
      const promise = isCommunity ? fetchNextCommunityPage() : fetchNextPage();
      Promise.resolve(promise)
        .then(() => {
          requestAnimationFrame(() => {
            if (messagesContainerRef.current) {
              const newHeight = messagesContainerRef.current.scrollHeight;
              messagesContainerRef.current.scrollTop = newHeight - prevHeight;
            }
          });
        })
        .finally(() => setIsLoadingMore(false));
    }
  }, [
    hasMore,
    isLoadingMore,
    isCommunity,
    fetchNextPage,
    fetchNextCommunityPage,
  ]);

  // ─── Send / Edit ─────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (
      content: string,
      type?: string,
      mediaUrl?: string,
      fileUrl?: string,
    ) => {
      const trimmed = content.trim();
      if (!trimmed && !mediaUrl && !fileUrl) return;

      if (editingMessage) {
        try {
          if (socket?.connected) {
            editSocketMessage(editingMessage.id, trimmed);
          } else {
            await editMessageMutation.mutateAsync({
              messageId: editingMessage.id,
              content: trimmed,
            });
          }
          toast.success("Message updated");
        } catch {
          toast.error("Failed to update message");
        } finally {
          setEditingMessage(null);
          setReplyTo(null);
        }
        return;
      }

      const payload = {
        content: trimmed,
        type: type || "TEXT",
        mediaUrl,
        fileUrl,
        replyToId: replyTo?.id,
      };

      try {
        if (socket?.connected) {
          sendSocketMessage(
            isCommunity ? { communityId, ...payload } : { chatId, ...payload },
          );
        } else if (isCommunity) {
          await sendCommunityMessageRest.mutateAsync({
            communityId: communityId!,
            ...payload,
          });
        } else {
          await sendMessageRest.mutateAsync({
            chatId: chatId!,
            ...payload,
          });
        }
      } catch {
        toast.error("Failed to send message");
      }

      setReplyTo(null);
      setEditingMessage(null);
      setTimeout(() => scrollToBottom(true), 50);
    },
    [
      editingMessage,
      socket,
      editSocketMessage,
      editMessageMutation,
      replyTo?.id,
      isCommunity,
      communityId,
      chatId,
      sendSocketMessage,
      sendCommunityMessageRest,
      sendMessageRest,
      scrollToBottom,
    ],
  );

  
  // ─── Voice from MessageInput (blob + duration) ───────────────────────────
  const handleVoiceBlob = useCallback(
    async (blob: Blob, duration: number) => {
      if (!blob || blob.size === 0) {
        toast.error("Empty recording");
        return;
      }

      if (blob.size > 5 * 1024 * 1024) {
        toast.error("Voice message too large (max 5MB)");
        return;
      }

      try {
        // ✅ Upload file to server
        const formData = new FormData();
        formData.append("file", blob, `voice-${Date.now()}.webm`);

        const uploadRes = await fetch(
          "http://localhost:3000/voice/upload-audio",
          {
            method: "POST",
            credentials: "include",
            body: formData,
          },
        );

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          throw new Error(errorData.message || "Upload failed");
        }

        const uploadData = await uploadRes.json();
        const mediaUrl = uploadData.url;

        if (!mediaUrl) {
          throw new Error("Upload response missing url");
        }

        // ✅ Send message with permanent URL
        const payload = {
          content: "Voice message",
          type: "VOICE_NOTE" as const,
          mediaUrl: mediaUrl,
          fileUrl: mediaUrl,
          duration: Math.max(1, Math.floor(duration || 1)),
          replyToId: replyTo?.id,
        };

        // ✅ Send via WebSocket or REST
        if (socket?.connected) {
          sendSocketMessage(
            isCommunity ? { communityId, ...payload } : { chatId, ...payload },
          );
        } else if (isCommunity) {
          await sendCommunityMessageRest.mutateAsync({
            communityId: communityId!,
            ...payload,
          });
        } else {
          await sendMessageRest.mutateAsync({
            chatId: chatId!,
            ...payload,
          });
        }

        toast.success("Voice message sent");
        setReplyTo(null);
        setTimeout(() => scrollToBottom(true), 50);
      } catch (err: any) {
        console.error("Voice upload error:", err);
        toast.error(err.message || "Failed to send voice message");
      }
    },
    [
      socket,
      sendSocketMessage,
      isCommunity,
      communityId,
      chatId,
      replyTo?.id,
      sendCommunityMessageRest,
      sendMessageRest,
      scrollToBottom,
    ],
  );

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (id: string) => {
      if (socket?.connected) deleteSocketMessage(id);
      else deleteMessageMutation.mutate(id);
      setShowMessageActions(null);
      setSelectedMessages((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [socket, deleteSocketMessage, deleteMessageMutation],
  );

  const handlePin = useCallback(
    (id: string, pinned: boolean) => {
      if (socket?.connected) pinSocketMessage(id, pinned);
      else pinMessageMutation.mutate({ messageId: id, pinned });
      setShowMessageActions(null);
    },
    [socket, pinSocketMessage, pinMessageMutation],
  );

  const handleReact = useCallback(
    (id: string, emoji: string) => {
      if (socket?.connected) {
        socket.emit("reaction:add", { messageId: id, emoji });
      }
      setShowMessageActions(null);
    },
    [socket],
  );

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
    setShowMessageActions(null);
  }, []);

  const handleTyping = useCallback(
    (typing: boolean) => {
      sendTyping?.(typing, targetId, isCommunity);
    },
    [sendTyping, targetId, isCommunity],
  );

  const toggleSelection = useCallback((id: string) => {
    setSelectedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  }, []);

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMMM d");
  };

  // ─── Context menu ────────────────────────────────────────────────────────
  const MessageContextMenu = ({
    message,
    onClose,
  }: {
    message: Message;
    onClose: () => void;
  }) => {
    const isOwn = message.senderId === user?.id;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute right-2 top-2 z-50 w-56 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-around gap-1 px-3 py-2.5 border-b border-slate-100">
          {["❤️", "👍", "😂", "😮", "😢"].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                handleReact(message.id, emoji);
                onClose();
              }}
              className="text-lg hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="py-1.5">
          <MenuItem
            icon={<Reply className="w-4 h-4" />}
            label="Reply"
            onClick={() => {
              setReplyTo(message);
              onClose();
            }}
          />
          {message.content && (
            <MenuItem
              icon={<Copy className="w-4 h-4" />}
              label="Copy"
              onClick={() => handleCopy(message.content!)}
            />
          )}
          <MenuItem
            icon={<Forward className="w-4 h-4" />}
            label="Forward"
            onClick={() => {
              toast.info("Forward coming soon");
              onClose();
            }}
          />
          {isOwn && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <MenuItem
                icon={<Edit className="w-4 h-4" />}
                label="Edit"
                onClick={() => {
                  setEditingMessage(message);
                  setReplyTo(null);
                  onClose();
                }}
              />
              <MenuItem
                icon={
                  message.isPinned ? (
                    <PinOff className="w-4 h-4" />
                  ) : (
                    <Pin className="w-4 h-4" />
                  )
                }
                label={message.isPinned ? "Unpin" : "Pin"}
                onClick={() => handlePin(message.id, !message.isPinned)}
              />
              <MenuItem
                icon={<Trash2 className="w-4 h-4" />}
                label="Delete"
                danger
                onClick={() => handleDelete(message.id)}
              />
            </>
          )}
          <div className="my-1 border-t border-slate-100" />
          <MenuItem
            icon={<Flag className="w-4 h-4" />}
            label="Report"
            danger
            onClick={() => {
              toast.info("Report submitted");
              onClose();
            }}
          />
        </div>
      </motion.div>
    );
  };

  const MenuItem = ({
    icon,
    label,
    onClick,
    danger,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-50/40">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="mt-3 text-sm text-slate-400">Loading conversation…</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-slate-50/40">
      {/* Header */}
      <header className="z-20 flex shrink-0 items-center gap-3 border-b border-slate-200/60 bg-white/90 px-3 py-2.5 backdrop-blur-md">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="relative shrink-0">
            {chatAvatar ? (
              <img
                src={chatAvatar}
                alt=""
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                {chatName.charAt(0).toUpperCase()}
              </div>
            )}
            {!isCommunity && !isGroup && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                  isOnline ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900">
              {chatName}
            </h2>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
              {isCommunity ? (
                "Community"
              ) : isGroup ? (
                <>
                  <Users className="h-3 w-3" />
                  {chat?.participants?.length || 0} members
                </>
              ) : isOnline ? (
                <>
                  <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                  Online
                </>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            className={`rounded-xl p-2 ${
              showSearch
                ? "bg-indigo-50 text-indigo-600"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Search className="h-5 w-5" />
          </button>
          {!isCommunity && !isGroup && (
            <>
              <button
                type="button"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <Phone className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <Video className="h-5 w-5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Search */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-slate-200/60 bg-white"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in conversation…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>
                    {searchIndex + 1}/{searchResults.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchIndex((i) => Math.max(0, i - 1))}
                    className="rounded-lg p-1 hover:bg-slate-100"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSearchIndex((i) =>
                        Math.min(searchResults.length - 1, i + 1),
                      )
                    }
                    className="rounded-lg p-1 hover:bg-slate-100"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="custom-scrollbar relative flex-1 overflow-y-auto px-3 py-4"
      >
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          </div>
        )}

        {messages.length > 0 ? (
          messages.map((msg, index) => {
            const prev = messages[index - 1];
            const showDate =
              index === 0 ||
              new Date(msg.createdAt).toDateString() !==
                new Date(prev.createdAt).toDateString();
            const isOwn = msg.senderId === user?.id;
            const isSearchHit =
              searchResults[searchIndex]?.id === msg.id && !!searchQuery;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="my-4 flex justify-center">
                    <span className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                      {formatDateLabel(new Date(msg.createdAt))}
                    </span>
                  </div>
                )}
                <div
                  ref={isSearchHit ? searchHighlightRef : undefined}
                  className={`relative group ${
                    isSelectionMode ? "cursor-pointer" : ""
                  } ${isSearchHit ? "ring-2 ring-indigo-400/60 rounded-2xl" : ""}`}
                  onClick={() => isSelectionMode && toggleSelection(msg.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!isSelectionMode) {
                      setShowMessageActions(
                        showMessageActions === msg.id ? null : msg.id,
                      );
                    }
                  }}
                >
                  {isSelectionMode && (
                    <div className="absolute left-1 top-1/2 z-10 -translate-y-1/2">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          selectedMessages.has(msg.id)
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {selectedMessages.has(msg.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  )}
                  <div className={isSelectionMode ? "pl-8" : ""}>
                    <MessageBubble
                      message={msg}
                      isOwn={isOwn}
                      onReply={() => setReplyTo(msg)}
                      onEdit={() => {
                        setEditingMessage(msg);
                        setReplyTo(null);
                      }}
                      onDelete={() => handleDelete(msg.id)}
                      onPin={(pinned) => handlePin(msg.id, pinned)}
                      onReact={(emoji) => handleReact(msg.id, emoji)}
                      isPinned={!!msg.isPinned}
                      isSelected={selectedMessages.has(msg.id)}
                      isSelectionMode={isSelectionMode}
                    />
                  </div>
                  <AnimatePresence>
                    {showMessageActions === msg.id && (
                      <MessageContextMenu
                        message={msg}
                        onClose={() => setShowMessageActions(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
              {isGroup || isCommunity ? (
                <Users className="h-8 w-8" />
              ) : (
                <MessageCircle className="h-8 w-8" />
              )}
            </div>
            <p className="text-sm font-medium text-slate-600">
              No messages yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-slate-400">
              {isGroup
                ? "Say hello to the group"
                : isCommunity
                  ? "Be the first to start the conversation"
                  : "Send a message to begin"}
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-28 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg"
          >
            <ChevronDown className="h-5 w-5 text-slate-600" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Selection toolbar */}
      <AnimatePresence>
        {isSelectionMode && selectedMessages.size > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3"
          >
            <span className="text-sm font-medium text-slate-700">
              {selectedMessages.size} selected
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toast.info("Forward coming soon")}
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
              >
                <Forward className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedMessages.forEach((id) => handleDelete(id));
                  exitSelection();
                }}
                className="rounded-xl p-2 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={exitSelection}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply / Edit banners */}
      <AnimatePresence>
        {(replyTo || editingMessage) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`mx-3 mb-2 flex items-center gap-3 rounded-2xl border-l-4 bg-white px-3 py-2.5 shadow-sm ${
                editingMessage ? "border-amber-500" : "border-indigo-500"
              }`}
            >
              {editingMessage ? (
                <Edit className="h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <Reply className="h-4 w-4 shrink-0 text-indigo-500" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    editingMessage ? "text-amber-600" : "text-indigo-600"
                  }`}
                >
                  {editingMessage
                    ? "Editing message"
                    : `Replying to ${
                        replyTo?.senderId === user?.id ? "yourself" : "message"
                      }`}
                </p>
                <p className="truncate text-xs text-slate-600">
                  {(editingMessage || replyTo)?.content || "Media"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReplyTo(null);
                  setEditingMessage(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input — recording lives in MessageInput */}
      <div className="shrink-0 border-t border-slate-200/60 bg-white px-3 py-3">
        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          onVoiceRecording={handleVoiceBlob}
          editingMessage={
            editingMessage
              ? { id: editingMessage.id, content: editingMessage.content || "" }
              : null
          }
          onCancelEdit={() => setEditingMessage(null)}
          isConnected={isConnected}
          onSelectMessages={() => {
            setIsSelectionMode((v) => !v);
            if (isSelectionMode) setSelectedMessages(new Set());
          }}
          isSelectionMode={isSelectionMode}
        />
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {typingUsers.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute bottom-[4.5rem] left-4 z-10 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur"
          >
            <div className="flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" />
            </div>
            <span className="text-xs text-slate-600">
              {Array.from(typingUsers).slice(0, 2).join(", ")}
              {typingUsers.size > 2 ? "…" : ""} typing
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info sidebar */}
      <AnimatePresence>
        {showInfo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfo(false)}
              className="absolute inset-0 z-30 bg-black/20 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 z-40 flex h-full w-80 flex-col border-l border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="font-semibold text-slate-900">Chat info</h3>
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className="rounded-xl p-2 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white">
                    {chatName.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900">
                    {chatName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isGroup
                      ? `${chat?.participants?.length || 0} members`
                      : isCommunity
                        ? "Community"
                        : "Private chat"}
                  </p>
                </div>
                <div className="mb-6 grid grid-cols-3 gap-2">
                  {!isCommunity && !isGroup && (
                    <>
                      <QuickAction
                        icon={<Phone className="h-5 w-5" />}
                        label="Call"
                      />
                      <QuickAction
                        icon={<Video className="h-5 w-5" />}
                        label="Video"
                      />
                    </>
                  )}
                  <QuickAction
                    icon={<Mic className="h-5 w-5" />}
                    label={isMuted ? "Unmute" : "Mute"}
                    onClick={() => setIsMuted((v) => !v)}
                  />
                </div>
                {isGroup && chat?.participants && (
                  <div>
                    <h5 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Members
                    </h5>
                    <div className="space-y-2">
                      {chat.participants.map((p) => (
                        <div key={p.userId} className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {p.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {p.user.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {p.role}
                            </p>
                          </div>
                          {p.userId === user?.id && (
                            <span className="text-[11px] font-medium text-indigo-500">
                              You
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const QuickAction = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 py-3 transition hover:bg-slate-100"
  >
    <span className="text-slate-600">{icon}</span>
    <span className="text-[10px] text-slate-500">{label}</span>
  </button>
);
