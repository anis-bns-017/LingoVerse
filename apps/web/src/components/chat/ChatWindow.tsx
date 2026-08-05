import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { Reply, X, Users, User, Circle, Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChatWindowProps {
  chatId?: string;
  communityId?: string;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  chatId, 
  communityId,
  onBack 
}) => {
  const { user } = useAuth();
  const isCommunity = !!communityId;
  const targetId = chatId || communityId || "";

  // Fetch data based on type
  const { data: chat } = useChat(chatId || "");
  const { data: chatMessages, isLoading: isLoadingChat } = useMessages(chatId || "");
  const { data: communityMessages, isLoading: isLoadingCommunity } = useCommunityMessages(communityId || "");
  
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
      // Message is already added to cache via queryClient
      // We just need to scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    onMessageDeleted: (data) => {
      toast.info("Message deleted");
    },
    onMessageEdited: (message) => {
      toast.info("Message edited");
    },
  });

  const [isTypingState, setIsTypingState] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastReadIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.senderId === user?.id) return;
    if (lastReadIdRef.current === last.id) return;
    lastReadIdRef.current = last.id;
    emitRead(last.id);
  }, [messages, user?.id, emitRead]);

  // Handle send message
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
            ...payload 
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
            ...payload 
          });
        } catch {
          // handled by mutation's onError toast
        }
      }
    }

    setReplyTo(null);
    setEditingMessage(null);
  };

  // Handle voice message recording
  const handleVoiceRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Create audio blob
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Send voice message
      if (isCommunity) {
        sendSocketVoiceMessage({ 
          communityId, 
          audioUrl, 
          duration: recordingDuration 
        });
      } else {
        sendSocketVoiceMessage({ 
          chatId, 
          audioUrl, 
          duration: recordingDuration 
        });
      }
      
      setIsRecording(false);
      setRecordingDuration(0);
      chunksRef.current = [];
      toast.success("Voice message sent");
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
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
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } catch (error) {
        console.error('Failed to start recording:', error);
        toast.error('Failed to access microphone. Please check permissions.');
      }
    }
  }, [isRecording, recordingDuration, isCommunity, chatId, communityId, sendSocketVoiceMessage]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle delete message
  const handleDeleteMessage = useCallback((messageId: string) => {
    if (socket?.connected) {
      deleteSocketMessage(messageId);
    } else {
      deleteMessageMutation.mutate(messageId);
    }
  }, [socket, deleteSocketMessage, deleteMessageMutation]);

  // Handle edit message
  const handleEditMessage = useCallback((messageId: string, content: string) => {
    if (socket?.connected) {
      editSocketMessage(messageId, content);
    } else {
      editMessageMutation.mutate({ messageId, content });
    }
    setEditingMessage(null);
  }, [socket, editSocketMessage, editMessageMutation]);

  // Handle pin message
  const handlePinMessage = useCallback((messageId: string, pinned: boolean) => {
    if (socket?.connected) {
      pinSocketMessage(messageId, pinned);
    } else {
      pinMessageMutation.mutate({ messageId, pinned });
    }
  }, [socket, pinSocketMessage, pinMessageMutation]);

  // Handle typing
  const handleTyping = (typingStatus: boolean) => {
    if (typingStatus !== isTypingState) {
      setIsTypingState(typingStatus);
      sendTyping(typingStatus, targetId, isCommunity);
    }
  };

  // Get chat name and avatar
  const getChatName = () => {
    if (isCommunity) return "Community Chat";
    if (!chat) return "Loading conversation...";
    if (chat.type === "PRIVATE") {
      const other = chat.participants.find((p) => p.userId !== user?.id)?.user;
      return other?.name || "Unknown User";
    }
    return chat.name || "Group Chat";
  };

  const getChatAvatar = () => {
    if (isCommunity) return null;
    if (!chat) return null;
    if (chat.type === "PRIVATE") {
      return chat.participants.find((p) => p.userId !== user?.id)?.user?.avatarUrl;
    }
    return chat.avatarUrl;
  };

  const otherUser = !isCommunity && chat?.type === "PRIVATE" 
    ? chat.participants.find((p) => p.userId !== user?.id)?.user 
    : null;
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const isGroup = !isCommunity && chat?.type !== "PRIVATE";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50/30">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="mt-2 text-sm text-slate-400">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          )}
          
          <div className="relative shrink-0">
            {getChatAvatar() ? (
              <img
                src={getChatAvatar()!}
                alt={getChatName()}
                className="w-10 h-10 rounded-2xl object-cover border border-slate-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-100 text-indigo-600 font-bold text-sm flex items-center justify-center border border-slate-100">
                {getChatName().charAt(0).toUpperCase()}
              </div>
            )}
            {!isCommunity && !isGroup && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-sm text-slate-800 leading-snug truncate">
              {getChatName()}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px]">
              {isCommunity ? (
                <span className="text-slate-400 font-medium">Community Chat</span>
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

        <div className="flex items-center gap-2">
          {/* Connection status indicator */}
          <span className={`text-[10px] font-mono px-2 py-1 rounded-full ${
            isConnected 
              ? 'bg-emerald-50 text-emerald-600' 
              : 'bg-amber-50 text-amber-600'
          }`}>
            {isConnected ? '● Live' : '● Reconnecting'}
          </span>
          
          {typingUsers.size > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50/80 text-indigo-600 rounded-full text-xs font-semibold animate-pulse">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
              </span>
              <span className="hidden sm:inline">Someone is typing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages && messages.length > 0 ? (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === user?.id}
              onReply={() => setReplyTo(msg)}
              onEdit={() => setEditingMessage(msg)}
              onDelete={() => handleDeleteMessage(msg.id)}
              onPin={(pinned) => handlePinMessage(msg.id, pinned)}
              onReact={(emoji) => {
                if (socket?.connected) {
                  socket.emit("reaction:add", { messageId: msg.id, emoji });
                }
              }}
              isPinned={msg.isPinned}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
              {isGroup ? (
                <Users className="w-6 h-6" />
              ) : isCommunity ? (
                <Users className="w-6 h-6" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500">
              No messages yet. Send a greeting to start chatting!
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply banner */}
      {replyTo && (
        <div className="mx-4 mb-2 p-3 bg-white rounded-2xl border-l-4 border-indigo-500 border-y border-r border-slate-100 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Reply className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Replying to message
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
            <Reply className="w-4 h-4 text-amber-500 shrink-0" />
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
        />
      </div>
    </div>
  );
};