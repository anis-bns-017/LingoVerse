import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useThread, useThreadMessages, useSendThreadMessage } from '../../hooks/useChat';
import { useAuth } from '../../contexts/AuthContext';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { 
  X, 
  Pin, 
  CornerDownRight, 
  MessageSquare, 
  Copy, 
  Users, 
  User, 
  Clock, 
  CheckCheck,
  Reply,
  MoreVertical,
  Loader2,
  PinOff,
  Share2,
  Bookmark,
  Flag,
  Trash2,
  Edit,
  Link,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Sender {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Message {
  id: string;
  senderId: string;
  sender?: Sender;
  content: string;
  type?: string;
  mediaUrl?: string;
  fileUrl?: string;
  attachments?: any[];
  createdAt: string | Date;
  isEdited?: boolean;
  isPinned?: boolean;
  reactions?: any[];
  replyTo?: Message;
}

interface ThreadViewProps {
  threadId: string;
  parentMessage: Message;
  onClose: () => void;
  onPinThread?: (threadId: string, pinned: boolean) => void;
  onDeleteThread?: (threadId: string) => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({ 
  threadId, 
  parentMessage, 
  onClose,
  onPinThread,
  onDeleteThread
}) => {
  const { user } = useAuth();
  const { isLoading: isThreadLoading, data: thread } = useThread(threadId);
  const { data: messages, isLoading: isMessagesLoading, refetch } = useThreadMessages(threadId);
  const sendMessage = useSendThreadMessage();

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll logic
  const scrollToBottom = useCallback((smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mark messages as read
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    // Mark thread messages as read (implement your read receipt logic)
  }, [messages]);

  // Scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom);

    // Load more messages when scrolling up
    if (scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
      setIsLoadingMore(true);
      // Implement pagination logic
      setTimeout(() => {
        setIsLoadingMore(false);
        setHasMoreMessages(false);
      }, 1000);
    }
  }, [hasMoreMessages, isLoadingMore]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingMessage) {
          setEditingMessage(null);
        } else if (replyTo) {
          setReplyTo(null);
        } else {
          onClose();
        }
      }
      if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePinThread();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replyTo, editingMessage, onClose]);

  // Search messages
  useEffect(() => {
    if (!searchQuery.trim() || !messages) {
      setSearchResults([]);
      return;
    }
    
    const results = messages.filter(m => 
      m.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
    setSearchIndex(0);
  }, [searchQuery, messages]);

  const handleSend = async (content: string, type?: string, mediaUrl?: string, fileUrl?: string) => {
    if (!content.trim() && !mediaUrl && !fileUrl) return;
    
    try {
      await sendMessage.mutateAsync({
        threadId,
        content,
        type: type || 'TEXT',
        mediaUrl,
        fileUrl,
        replyToId: replyTo?.id,
      });
      setReplyTo(null);
      setEditingMessage(null);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      // Implement edit message logic
      toast.success('Message edited');
      setEditingMessage(null);
    } catch (error) {
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        // Implement delete message logic
        toast.success('Message deleted');
      } catch (error) {
        toast.error('Failed to delete message');
      }
    }
  };

  const handlePinThread = () => {
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);
    onPinThread?.(threadId, newPinnedState);
    toast.success(newPinnedState ? 'Thread pinned' : 'Thread unpinned');
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/thread/${threadId}`;
    navigator.clipboard.writeText(url);
    toast.success('Thread link copied to clipboard');
  };

  const handleShareThread = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Thread Conversation',
        text: `Check out this thread: ${parentMessage.content}`,
        url: `${window.location.origin}/thread/${threadId}`,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleTyping = (isTyping: boolean) => {
    setIsTyping(isTyping);
    // Implement typing indicator logic
  };

  const handleReact = (messageId: string, emoji: string) => {
    // Implement reaction logic
    toast.success(`Reacted with ${emoji}`);
  };

  const getParticipantCount = useMemo(() => {
    if (!messages) return 0;
    const uniqueUsers = new Set(messages.map(m => m.senderId));
    return uniqueUsers.size;
  }, [messages]);

  const getMessageCount = useMemo(() => {
    return messages?.length || 0;
  }, [messages]);

  const formatTimestamp = (date: string | Date) => {
    const d = new Date(date);
    return format(d, 'MMM d, yyyy HH:mm');
  };

  const isLoading = isThreadLoading || isMessagesLoading;

  return (
    <motion.div 
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="flex flex-col h-full bg-white border-l border-slate-200 w-full max-w-lg shadow-2xl relative"
    >
      {/* Thread Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            {isTyping && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white">
                <span className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
              </span>
            )}
          </div>
          
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-slate-900 leading-tight flex items-center gap-2">
              Thread
              {thread?.isPinned && (
                <Pin className="w-3 h-3 text-indigo-500 fill-indigo-500" />
              )}
            </h3>
            <p className="text-xs text-slate-500 truncate flex items-center gap-2">
              <span>{getMessageCount} messages</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>{getParticipantCount} participants</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Search toggle */}
          <button
            onClick={() => setIsSearching(!isSearching)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Search in thread"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Pin button */}
          <button
            onClick={handlePinThread}
            className={`p-1.5 rounded-lg transition-colors ${
              isPinned 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            aria-label={isPinned ? 'Unpin thread' : 'Pin thread'}
            title={isPinned ? 'Unpin thread (Ctrl+P)' : 'Pin thread (Ctrl+P)'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>

          {/* Share button */}
          <button
            onClick={handleShareThread}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Share thread"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* More options */}
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close thread"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action dropdown */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 right-4 bg-white rounded-xl shadow-xl border border-slate-100 py-2 min-w-[180px] z-30"
          >
            <button
              onClick={() => {
                handleCopyLink();
                setShowActions(false);
              }}
              className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            >
              <Link className="w-3.5 h-3.5" /> Copy link
            </button>
            <button
              onClick={() => {
                handlePinThread();
                setShowActions(false);
              }}
              className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              {isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              onClick={() => {
                toast.info('Thread bookmarked');
                setShowActions(false);
              }}
              className="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            >
              <Bookmark className="w-3.5 h-3.5" /> Bookmark
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this thread?')) {
                  onDeleteThread?.(threadId);
                  onClose();
                  toast.success('Thread deleted');
                }
                setShowActions(false);
              }}
              className="w-full px-4 py-2 text-left text-xs hover:bg-red-50 flex items-center gap-2 text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete thread
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="p-3 flex items-center gap-2">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search in thread..."
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
                    onClick={() => setSearchIndex(Math.min(searchResults.length - 1, searchIndex + 1))}
                    className="p-1 hover:bg-slate-100 rounded-lg"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parent Message */}
      {parentMessage && (
        <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 p-4 border-b border-slate-200 relative group hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold flex items-center justify-center text-sm flex-shrink-0">
              {parentMessage.sender?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-700 truncate">
                  {parentMessage.sender?.name || 'Unknown Sender'}
                </span>
                <span className="text-[10px] text-slate-400 flex-shrink-0" title={formatTimestamp(parentMessage.createdAt)}>
                  {formatDistanceToNow(new Date(parentMessage.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                {parentMessage.content}
              </p>
              {parentMessage.mediaUrl && (
                <div className="mt-2">
                  <img 
                    src={parentMessage.mediaUrl} 
                    alt="attachment" 
                    className="max-h-40 rounded-lg object-cover" 
                  />
                </div>
              )}
            </div>
          </div>
          <div className="absolute bottom-1 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setReplyTo(parentMessage)}
              className="p-1 hover:bg-white/80 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
              title="Reply to parent"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Thread Info */}
      <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {getParticipantCount} participants
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span>{getMessageCount} messages</span>
        </div>
        {thread?.lastActive && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last active {formatDistanceToNow(new Date(thread.lastActive), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
      >
        {isLoading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-9 h-9 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          <>
            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              </div>
            )}
            
            {messages.map((msg: Message, index: number) => {
              const showDate = index === 0 || 
                new Date(msg.createdAt).toDateString() !== 
                new Date(messages[index - 1].createdAt).toDateString();
              
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-[10px] font-medium text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
                        {format(new Date(msg.createdAt), 'EEEE, MMMM d')}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={msg}
                    isOwn={msg.senderId === user?.id}
                    onReply={() => setReplyTo(msg)}
                    onEdit={() => setEditingMessage(msg)}
                    onDelete={() => handleDeleteMessage(msg.id)}
                    onReact={(emoji) => handleReact(msg.id, emoji)}
                    isPinned={msg.isPinned}
                  />
                </div>
              );
            })}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600">No replies yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Start the conversation by sending a message below.
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-28 right-4 p-2 bg-white rounded-full shadow-lg border border-slate-100 hover:shadow-xl transition-shadow z-10"
        >
          <ChevronDown className="w-4 h-4 text-slate-600" />
        </motion.button>
      )}

      {/* Reply/Edit Input Area */}
      <div className="border-t border-slate-200 bg-white p-3 space-y-2">
        {/* Reply indicator */}
        {replyTo && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-xs text-slate-600 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
              <span className="truncate">
                Replying to <span className="font-semibold">{replyTo.sender?.name || 'message'}</span>
              </span>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-indigo-100/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* Edit indicator */}
        {editingMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-xs text-slate-600 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Edit className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="truncate font-medium">Editing message</span>
            </div>
            <button
              onClick={() => setEditingMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-amber-100/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        <MessageInput 
          onSend={handleSend}
          onTyping={handleTyping}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          placeholder="Reply in thread..."
          isConnected={true}
        />
        
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {isTyping && (
            <span className="flex items-center gap-1 text-indigo-500">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" />
              </span>
              Typing...
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};