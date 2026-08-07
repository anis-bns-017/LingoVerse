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
  User,
  Circle,
  Mic,
  MicOff,
  Loader2,
  MoreVertical,
  Search,
  Pin,
  Bell,
  BellOff,
  UserPlus,
  UserMinus,
  Shield,
  Info,
  Phone,
  Video,
  Smile,
  Paperclip,
  Image,
  File,
  Camera,
  Gift,
  Clock,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  AtSign,
  Hash,
  Link,
  Calendar,
  MapPin,
  FolderOpen,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  Copy,
  Trash2,
  Edit,
  Flag,
  Bookmark,
  MessageCircle,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  Frown,
  Meh,
  AlertCircle,
  Settings,
  LogOut,
  Menu,
  Star,
  StarOff,
  Image as ImageIcon,
  Film,
  Music as MusicIcon,
  FileText,
  Archive,
  PinOff,
  ReplyAll,
  Forward,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface ChatWindowProps {
  chatId?: string;
  communityId?: string;
  onBack?: () => void;
}

interface EmojiReaction {
  emoji: string;
  count: number;
  users: string[];
}

interface MessageWithReactions extends Message {
  reactions?: EmojiReaction[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  communityId,
  onBack,
}) => {
  const { user } = useAuth();
  const isCommunity = !!communityId;
  const targetId = chatId || communityId || "";

  // State
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [showPinned, setShowPinned] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isTypingState, setIsTypingState] = useState(false);
  const [showMessageActions, setShowMessageActions] = useState<string | null>(
    null,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messageFilter, setMessageFilter] = useState<
    "all" | "media" | "files" | "links"
  >("all");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [voiceMessagePlaying, setVoiceMessagePlaying] = useState<string | null>(
    null,
  );
  const [voiceProgress, setVoiceProgress] = useState(0);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastReadIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hooks
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

  const messages = isCommunity ? communityMessages : chatMessages;
  const isLoading = isCommunity ? isLoadingCommunity : isLoadingChat;

  const sendMessageRest = useSendMessage();
  const sendCommunityMessageRest = useSendCommunityMessage();
  const deleteMessageMutation = useDeleteMessage();
  const editMessageMutation = useEditMessage();
  const pinMessageMutation = usePinMessage();

  const {
    socket,
    isConnected,
    typingUsers,
    onlineUsers,
    sendMessage: sendSocketMessage,
    sendVoiceMessage: sendSocketVoiceMessage,
    sendTyping,
    emitRead,
    deleteMessage: deleteSocketMessage,
    editMessage: editSocketMessage,
    pinMessage: pinSocketMessage,
    fetchMessages,
  } = useChatSocket(targetId, user?.id || "", {
    onNewMessage: (message) => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      if (!isNearBottom) {
        toast.info("New message received");
      }
    },
    onMessageDeleted: (data) => {
      toast.info("Message deleted");
    },
    onMessageEdited: (message) => {
      toast.info("Message edited");
    },
    onReactionAdded: (data) => {
      // Update reactions in UI
    },
    onReactionRemoved: (data) => {
      // Update reactions in UI
    },
  });

  // Computed values
  const chatName = useMemo(() => {
    if (isCommunity) return "Community Chat";
    if (!chat) return "Loading conversation...";
    if (chat.type === "PRIVATE") {
      const other = chat.participants.find((p) => p.userId !== user?.id)?.user;
      return other?.name || "Unknown User";
    }
    return chat.name || "Group Chat";
  }, [chat, isCommunity, user?.id]);

  const chatAvatar = useMemo(() => {
    if (isCommunity) return null;
    if (!chat) return null;
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

  // Filter messages
  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    let filtered = messages;

    if (messageFilter === "media") {
      filtered = filtered.filter(
        (m) => m.type === "IMAGE" || m.type === "VIDEO" || m.type === "AUDIO",
      );
    } else if (messageFilter === "files") {
      filtered = filtered.filter(
        (m) => m.type === "FILE" || m.type === "DOCUMENT",
      );
    } else if (messageFilter === "links") {
      filtered = filtered.filter((m) => m.content?.includes("http"));
    }

    return filtered;
  }, [messages, messageFilter]);

  // Search messages
  useEffect(() => {
    if (!searchQuery.trim() || !messages) {
      setSearchResults([]);
      return;
    }

    const results = messages.filter((m) =>
      m.content?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setSearchResults(results);
    setSearchIndex(0);
  }, [searchQuery, messages]);

  // Auto-scroll
  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isNearBottom]);

  // Mark messages as read
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.senderId === user?.id) return;
    if (lastReadIdRef.current === last.id) return;
    lastReadIdRef.current = last.id;
    emitRead(last.id);
  }, [messages, user?.id, emitRead]);

  // Scroll handler
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom);

    // Load more messages when scrolling up
    if (scrollTop < 100 && hasNextPage && !isLoadingMore) {
      setIsLoadingMore(true);
      if (isCommunity) {
        fetchNextCommunityPage();
      } else {
        fetchNextPage();
      }
      setTimeout(() => setIsLoadingMore(false), 1000);
    }
  }, [
    hasNextPage,
    isLoadingMore,
    isCommunity,
    fetchNextPage,
    fetchNextCommunityPage,
  ]);

  // Send message
  const handleSend = async (
    content: string,
    type?: string,
    mediaUrl?: string,
    fileUrl?: string,
  ) => {
    if (!content.trim() && !mediaUrl && !fileUrl) return;

    const payload = {
      content,
      type: type || "TEXT",
      mediaUrl,
      fileUrl,
      replyToId: replyTo?.id,
    };

    if (isCommunity) {
      if (socket?.connected) {
        sendSocketMessage({ communityId, ...payload });
      } else {
        try {
          await sendCommunityMessageRest.mutateAsync({
            communityId: communityId!,
            ...payload,
          });
        } catch {
          // handled by mutation's onError toast
        }
      }
    } else {
      if (socket?.connected) {
        sendSocketMessage({ chatId, ...payload });
      } else {
        try {
          await sendMessageRest.mutateAsync({
            chatId: chatId!,
            ...payload,
          });
        } catch {
          // handled by mutation's onError toast
        }
      }
    }

    setReplyTo(null);
    setEditingMessage(null);
    setShowAttachmentMenu(false);
  };

  // Voice recording
  const handleVoiceRecording = useCallback(async () => {
    if (isRecording) {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);

      if (isCommunity) {
        sendSocketVoiceMessage({
          communityId,
          audioUrl,
          duration: recordingDuration,
        });
      } else {
        sendSocketVoiceMessage({
          chatId,
          audioUrl,
          duration: recordingDuration,
        });
      }

      setIsRecording(false);
      setRecordingDuration(0);
      chunksRef.current = [];
      toast.success("Voice message sent");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(100);
        setIsRecording(true);
        setRecordingDuration(0);

        timerRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } catch (error) {
        console.error("Failed to start recording:", error);
        toast.error("Failed to access microphone. Please check permissions.");
      }
    }
  }, [
    isRecording,
    recordingDuration,
    isCommunity,
    chatId,
    communityId,
    sendSocketVoiceMessage,
  ]);

  // Message actions
  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (socket?.connected) {
        deleteSocketMessage(messageId);
      } else {
        deleteMessageMutation.mutate(messageId);
      }
      setShowMessageActions(null);
    },
    [socket, deleteSocketMessage, deleteMessageMutation],
  );

  const handleEditMessage = useCallback(
    (messageId: string, content: string) => {
      if (socket?.connected) {
        editSocketMessage(messageId, content);
      } else {
        editMessageMutation.mutate({ messageId, content });
      }
      setEditingMessage(null);
      setShowMessageActions(null);
    },
    [socket, editSocketMessage, editMessageMutation],
  );

  const handlePinMessage = useCallback(
    (messageId: string, pinned: boolean) => {
      if (socket?.connected) {
        pinSocketMessage(messageId, pinned);
      } else {
        pinMessageMutation.mutate({ messageId, pinned });
      }
      setShowMessageActions(null);
    },
    [socket, pinSocketMessage, pinMessageMutation],
  );

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied to clipboard");
    setShowMessageActions(null);
  }, []);

  const handleForwardMessage = useCallback((message: Message) => {
    // Implement forward functionality
    toast.info("Forward message feature");
    setShowMessageActions(null);
  }, []);

  const handleReactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (socket?.connected) {
        socket.emit("reaction:add", { messageId, emoji });
      }
      setShowMessageActions(null);
    },
    [socket],
  );

  // Typing handler
  const handleTyping = (typingStatus: boolean) => {
    if (typingStatus !== isTypingState) {
      setIsTypingState(typingStatus);
      sendTyping(typingStatus, targetId, isCommunity);
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (!isSelectionMode) {
      setSelectedMessages([]);
    }
  };

  // Select message
  const selectMessage = (messageId: string) => {
    setSelectedMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId],
    );
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const element = document.getElementById("chat-window-container");
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Message context menu
  const MessageContextMenu = ({
    message,
    onClose,
  }: {
    message: Message;
    onClose: () => void;
  }) => {
    const isOwn = message.senderId === user?.id;
    const isPinned = message.isPinned;

    return (
      <div className="absolute right-0 top-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 min-w-[220px] z-50">
        <div className="px-4 py-2 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-800">
            Message Actions
          </p>
        </div>

        <button
          onClick={() => {
            handleReactToMessage(message.id, "❤️");
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
        >
          <Heart className="w-4 h-4 text-red-500" /> React with ❤️
        </button>

        <button
          onClick={() => {
            handleReactToMessage(message.id, "👍");
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
        >
          <ThumbsUp className="w-4 h-4 text-blue-500" /> React with 👍
        </button>

        {message.content && (
          <button
            onClick={() => {
              handleCopyMessage(message.content);
              onClose();
            }}
            className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
        )}

        <button
          onClick={() => {
            setReplyTo(message);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
        >
          <Reply className="w-4 h-4" /> Reply
        </button>

        <button
          onClick={() => {
            handleForwardMessage(message);
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
        >
          <Forward className="w-4 h-4" /> Forward
        </button>

        {isOwn && (
          <>
            <button
              onClick={() => {
                setEditingMessage(message);
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
            >
              <Edit className="w-4 h-4 text-blue-500" /> Edit
            </button>

            <button
              onClick={() => {
                handlePinMessage(message.id, !isPinned);
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2"
            >
              {isPinned ? (
                <PinOff className="w-4 h-4" />
              ) : (
                <Pin className="w-4 h-4" />
              )}
              {isPinned ? "Unpin" : "Pin"}
            </button>

            <button
              onClick={() => {
                handleDeleteMessage(message.id);
                onClose();
              }}
              className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-red-500"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </>
        )}

        <button
          onClick={() => {
            toast.info("Report message");
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-red-500"
        >
          <Flag className="w-4 h-4" /> Report
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50/30">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="mt-2 text-sm text-slate-400">Loading messages...</p>
      </div>
    );
  }

  return (
    <div
      id="chat-window-container"
      className={`flex flex-col h-full bg-slate-50/30 ${isFullscreen ? "fixed inset-0 z-50" : ""}`}
    >
      {/* Header */}
      <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 shadow-sm">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          )}

          <div
            className="relative shrink-0 cursor-pointer group"
            onClick={() => setShowInfo(!showInfo)}
          >
            {chatAvatar ? (
              <img
                src={chatAvatar}
                alt={chatName}
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 group-hover:border-indigo-400 transition-colors"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center border-2 border-slate-100 group-hover:border-indigo-400 transition-colors">
                {chatName.charAt(0).toUpperCase()}
              </div>
            )}
            {!isCommunity && !isGroup && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  isOnline ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            )}
          </div>

          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => setShowInfo(!showInfo)}
          >
            <h2 className="font-bold text-sm text-slate-800 leading-snug truncate">
              {chatName}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px]">
              {isCommunity ? (
                <span className="text-slate-400 font-medium">
                  Community Chat
                </span>
              ) : isGroup ? (
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Users className="w-3 h-3" />{" "}
                  {chat?.participants?.length || 0} members
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

        <div className="flex items-center gap-1">
          {/* Search button */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-700"
            title="Search messages"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Call buttons */}
          {!isCommunity && !isGroup && (
            <>
              <button
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-700"
                title="Voice call"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-700"
                title="Video call"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}

          {/* More options */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-700"
            title="Chat info"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="p-3 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  autoFocus
                />
              </div>
              {searchResults.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">
                    {searchIndex + 1}/{searchResults.length}
                  </span>
                  <button
                    onClick={() => setSearchIndex(Math.max(0, searchIndex - 1))}
                    className="p-1 hover:bg-slate-100 rounded-lg"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setSearchIndex(
                        Math.min(searchResults.length - 1, searchIndex + 1),
                      )
                    }
                    className="p-1 hover:bg-slate-100 rounded-lg"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="px-3 pb-2 text-xs text-slate-400">
                Found {searchResults.length} messages
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned messages banner */}
      {showPinned && (
        <div className="bg-indigo-50/80 border-b border-indigo-100 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-600">
              Pinned Messages
            </span>
          </div>
          <button onClick={() => setShowPinned(false)}>
            <X className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      )}

      {/* Chat info sidebar */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-100 shadow-2xl z-40 overflow-y-auto"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Chat Info</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Chat avatar and name */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-3">
                  {chatName.charAt(0).toUpperCase()}
                </div>
                <h4 className="font-bold text-slate-800">{chatName}</h4>
                <p className="text-xs text-slate-400">
                  {isGroup
                    ? `${chat?.participants?.length || 0} members`
                    : "Private chat"}
                </p>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-3 gap-2">
                {!isCommunity && !isGroup && (
                  <>
                    <button className="p-3 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
                      <Phone className="w-5 h-5 mx-auto text-slate-600" />
                      <p className="text-[10px] mt-1 text-slate-500">Call</p>
                    </button>
                    <button className="p-3 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
                      <Video className="w-5 h-5 mx-auto text-slate-600" />
                      <p className="text-[10px] mt-1 text-slate-500">Video</p>
                    </button>
                  </>
                )}
                <button className="p-3 bg-slate-50 rounded-xl text-center hover:bg-slate-100 transition-colors">
                  <Bell className="w-5 h-5 mx-auto text-slate-600" />
                  <p className="text-[10px] mt-1 text-slate-500">
                    {isMuted ? "Unmute" : "Mute"}
                  </p>
                </button>
              </div>

              {/* Media preview */}
              <div>
                <h5 className="text-xs font-semibold text-slate-600 mb-2">
                  Media
                </h5>
                <div className="grid grid-cols-3 gap-1">
                  {messages
                    ?.filter((m) => m.type === "IMAGE")
                    .slice(0, 3)
                    .map((m, i) => (
                      <div
                        key={i}
                        className="aspect-square bg-slate-100 rounded-lg overflow-hidden"
                      >
                        {m.mediaUrl && (
                          <img
                            src={m.mediaUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  {messages?.filter((m) => m.type === "IMAGE").length === 0 && (
                    <p className="text-xs text-slate-400 col-span-3">
                      No media shared yet
                    </p>
                  )}
                </div>
              </div>

              {/* Members (for groups) */}
              {isGroup && chat?.participants && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-600 mb-2">
                    Members
                  </h5>
                  <div className="space-y-2">
                    {chat.participants.map((p) => (
                      <div key={p.userId} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
                          {p.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">
                            {p.user.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{p.role}</p>
                        </div>
                        {p.userId === user?.id && (
                          <span className="text-[10px] text-indigo-500 font-medium">
                            You
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar relative"
      >
        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        )}

        {/* Message filter tabs */}
        {messages && messages.length > 0 && (
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {["all", "media", "files", "links"].map((filter) => (
              <button
                key={filter}
                onClick={() => setMessageFilter(filter as any)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  messageFilter === filter
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        )}

        {filteredMessages && filteredMessages.length > 0 ? (
          filteredMessages.map((msg, index) => {
            const showDate =
              index === 0 ||
              new Date(msg.createdAt).toDateString() !==
                new Date(filteredMessages[index - 1].createdAt).toDateString();
            const isOwn = msg.senderId === user?.id;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="text-[10px] font-medium text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
                      {format(new Date(msg.createdAt), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                )}

                <div
                  className={`relative ${isSelectionMode ? "cursor-pointer hover:bg-slate-50/50 rounded-xl transition-colors" : ""}`}
                  onClick={() => isSelectionMode && selectMessage(msg.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowMessageActions(
                      showMessageActions === msg.id ? null : msg.id,
                    );
                  }}
                >
                  {isSelectionMode && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedMessages.includes(msg.id)}
                        onChange={() => selectMessage(msg.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={isOwn}
                    onReply={() => setReplyTo(msg)}
                    onEdit={() => setEditingMessage(msg)}
                    onDelete={() => handleDeleteMessage(msg.id)}
                    onPin={(pinned) => handlePinMessage(msg.id, pinned)}
                    onReact={(emoji) => handleReactToMessage(msg.id, emoji)}
                    isPinned={msg.isPinned}
                    isSelected={selectedMessages.includes(msg.id)}
                    isSelectionMode={isSelectionMode}
                  />

                  {/* Message context menu */}
                  {showMessageActions === msg.id && (
                    <div className="absolute right-0 top-0 mt-2 z-50">
                      <MessageContextMenu
                        message={msg}
                        onClose={() => setShowMessageActions(null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
              {isGroup ? (
                <Users className="w-8 h-8" />
              ) : isCommunity ? (
                <Users className="w-8 h-8" />
              ) : (
                <MessageCircle className="w-8 h-8" />
              )}
            </div>
            <p className="text-sm font-semibold text-slate-500">
              No messages yet
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              {isGroup
                ? "Start the conversation with your group members"
                : isCommunity
                  ? "Be the first to send a message in this community"
                  : "Send a greeting to start chatting!"}
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() =>
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          className="absolute bottom-24 right-4 p-2 bg-white rounded-full shadow-lg border border-slate-100 hover:shadow-xl transition-shadow"
        >
          <ChevronDown className="w-5 h-5 text-slate-600" />
        </button>
      )}

      {/* Selection mode toolbar */}
      {isSelectionMode && selectedMessages.length > 0 && (
        <div className="bg-white border-t border-slate-100 p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">
            {selectedMessages.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Forward selected messages
                toast.info("Forward messages");
              }}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600"
            >
              <Forward className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                // Delete selected messages
                selectedMessages.forEach((id) => handleDeleteMessage(id));
                setSelectedMessages([]);
                setIsSelectionMode(false);
              }}
              className="p-2 hover:bg-red-50 rounded-xl text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedMessages([]);
                setIsSelectionMode(false);
              }}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div className="mx-4 mb-2 p-3 bg-white rounded-2xl border-l-4 border-indigo-500 border-y border-r border-slate-100 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Reply className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Replying to{" "}
                {replyTo.senderId === user?.id ? "yourself" : "message"}
              </p>
              <p className="text-xs text-slate-600 truncate font-medium">
                {replyTo.content || "Media attachment"}
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

      {/* Edit banner */}
      {editingMessage && (
        <div className="mx-4 mb-2 p-3 bg-white rounded-2xl border-l-4 border-amber-500 border-y border-r border-slate-100 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Edit className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                Editing message
              </p>
              <p className="text-xs text-slate-600 truncate font-medium">
                {editingMessage.content || "Media attachment"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditingMessage(null)}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0">
        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          onVoiceRecording={handleVoiceRecording}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          isConnected={isConnected}
          onEmojiPickerToggle={() => setShowEmojiPicker(!showEmojiPicker)}
          onAttachmentToggle={() => setShowAttachmentMenu(!showAttachmentMenu)}
          onSelectMessages={() => toggleSelectionMode()}
          isSelectionMode={isSelectionMode}
        />
      </div>

      {/* Typing indicator */}
      {typingUsers.size > 0 && (
        <div className="absolute bottom-20 left-4 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
          </div>
          <span className="text-xs font-medium text-slate-600">
            {Array.from(typingUsers).join(", ")} typing...
          </span>
        </div>
      )}
    </div>
  );
};
