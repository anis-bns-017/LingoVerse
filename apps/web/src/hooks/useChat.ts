import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api/client";
import { toast } from "sonner";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// ---------- Types ----------
export interface Chat {
  id: string;
  type: "PRIVATE" | "GROUP" | "CHANNEL" | "THREAD";
  name?: string;
  description?: string;
  avatarUrl?: string;
  isPublic?: boolean;
  ownerId?: string;
  participants: ChatParticipant[];
  messages?: Message[];
  updatedAt: string;
}

export interface ChatParticipant {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  role: string;
  isMuted?: boolean;
  isPinned?: boolean;
  joinedAt: string;
  lastReadAt?: string;
}

export interface Message {
  id: string;
  chatId?: string;
  communityId?: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  content: string | null;
  type: string;
  mediaUrl?: string;
  fileUrl?: string;
  replyToId?: string;
  replyTo?: Partial<Message>;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  reactions: Reaction[];
  attachments: Attachment[];
  translations: Translation[];
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export interface Attachment {
  id: string;
  url: string;
  type: string;
  filename: string;
  size: number;
}

export interface Translation {
  id: string;
  language: string;
  translatedContent: string;
}

export interface SendMessagePayload {
  chatId?: string;
  communityId?: string;
  content?: string;
  type?: string;
  mediaUrl?: string;
  fileUrl?: string;
  replyToId?: string;
}

// ---------- API Calls ----------

export const chatApi = {
  getUserChats: () => apiClient.get<Chat[]>("/chat"),
  getChatById: (chatId: string) => apiClient.get<Chat>(`/chat/${chatId}`),
  getMessages: (chatId: string, params?: { limit?: number; before?: string }) =>
    apiClient.get<Message[]>(`/chat/${chatId}/messages`, { params }),
  sendMessage: (data: SendMessagePayload) =>
    apiClient.post<Message>("/chat/messages", data),
  createPrivateChat: (userId: string) =>
    apiClient.post<Chat>(`/chat/private/${userId}`),
  createGroupChat: (data: { name: string; participantIds: string[] }) =>
    apiClient.post<Chat>("/chat/group", data),
  addParticipants: (chatId: string, userIds: string[]) =>
    apiClient.post(`/chat/group/${chatId}/add`, { userIds }),
  removeParticipant: (chatId: string, userId: string) =>
    apiClient.delete(`/chat/group/${chatId}/remove/${userId}`),
  markRead: (chatId: string, messageId: string) =>
    apiClient.put("/chat/messages/read", { chatId, messageId }),
  addReaction: (messageId: string, emoji: string) =>
    apiClient.post("/chat/messages/reaction", { messageId, emoji }),
  removeReaction: (messageId: string, emoji: string) =>
    apiClient.delete(`/chat/messages/${messageId}/reaction/${emoji}`),
  getReadReceipts: (messageId: string) =>
    apiClient.get(`/chat/messages/${messageId}/read-receipts`),
  searchMessages: (chatId: string, query: string) =>
    apiClient.get<Message[]>(`/chat/search/${chatId}`, {
      params: { q: query },
    }),
  deleteMessage: (messageId: string) =>
    apiClient.delete(`/chat/messages/${messageId}`),
  editMessage: (messageId: string, content: string) =>
    apiClient.put(`/chat/messages/${messageId}`, { content }),
  pinMessage: (messageId: string, pinned: boolean) =>
    apiClient.put(`/chat/messages/${messageId}/pin`, { pinned }),
  getCommunityMessages: (
    communityId: string,
    params?: { limit?: number; before?: string },
  ) =>
    apiClient.get<Message[]>(`/communities/${communityId}/messages`, {
      params,
    }),
  sendCommunityMessage: (
    communityId: string,
    data: {
      content: string;
      type?: string;
      mediaUrl?: string;
      fileUrl?: string;
      replyToId?: string;
    },
  ) => apiClient.post<Message>(`/communities/${communityId}/messages`, data),
};

// ---------- Query hooks ----------

export const useChats = () => {
  return useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const response = await chatApi.getUserChats();
      return response.data;
    },
  });
};

export const useChat = (chatId: string) => {
  return useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const response = await chatApi.getChatById(chatId);
      return response.data;
    },
    enabled: !!chatId,
  });
};

export const useMessages = (chatId: string, limit = 50) => {
  return useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      const response = await chatApi.getMessages(chatId, { limit });
      return response.data.slice().reverse();
    },
    enabled: !!chatId,
  });
};

export const useCommunityMessages = (communityId: string, limit = 50) => {
  return useQuery({
    queryKey: ["community-messages", communityId],
    queryFn: async () => {
      const response = await chatApi.getCommunityMessages(communityId, {
        limit,
      });
      return response.data.slice().reverse();
    },
    enabled: !!communityId,
  });
};

// ---------- Message Mutations ----------

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SendMessagePayload) => {
      const response = await chatApi.sendMessage(data);
      return response.data;
    },
    onSuccess: (message, variables) => {
      const queryKey = variables.chatId
        ? ["messages", variables.chatId]
        : variables.communityId
          ? ["community-messages", variables.communityId]
          : null;

      if (queryKey) {
        queryClient.setQueryData<Message[]>(queryKey, (old) => {
          if (!old) return [message];
          if (old.some((m) => m.id === message.id)) return old;
          return [...old, message];
        });
      }
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to send message");
    },
  });
};

export const useSendCommunityMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      communityId,
      content,
      type,
      mediaUrl,
      fileUrl,
      replyToId,
    }: {
      communityId: string;
      content: string;
      type?: string;
      mediaUrl?: string;
      fileUrl?: string;
      replyToId?: string;
    }) => {
      const response = await chatApi.sendCommunityMessage(communityId, {
        content,
        type,
        mediaUrl,
        fileUrl,
        replyToId,
      });
      return response.data;
    },
    onSuccess: (message, variables) => {
      queryClient.setQueryData<Message[]>(
        ["community-messages", variables.communityId],
        (old) => {
          if (!old) return [message];
          if (old.some((m) => m.id === message.id)) return old;
          return [...old, message];
        },
      );
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to send message");
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      await chatApi.deleteMessage(messageId);
    },
    onSuccess: (_, messageId) => {
      queryClient.setQueriesData<Message[]>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, content: "Message deleted" }
              : m,
          );
        },
      );
      toast.success("Message deleted");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete message");
    },
  });
};

export const useEditMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      content,
    }: {
      messageId: string;
      content: string;
    }) => {
      const response = await chatApi.editMessage(messageId, content);
      return response.data;
    },
    onSuccess: (message) => {
      queryClient.setQueriesData<Message[]>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === message.id
              ? { ...m, content: message.content, isEdited: true }
              : m,
          );
        },
      );
      toast.success("Message edited");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to edit message");
    },
  });
};

export const usePinMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      pinned,
    }: {
      messageId: string;
      pinned: boolean;
    }) => {
      const response = await chatApi.pinMessage(messageId, pinned);
      return response.data;
    },
    onSuccess: (message) => {
      queryClient.setQueriesData<Message[]>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === message.id ? { ...m, isPinned: message.isPinned } : m,
          );
        },
      );
      toast.success(message.isPinned ? "Message pinned" : "Message unpinned");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to pin message");
    },
  });
};

// ---------- Chat Management Mutations ----------

export const useCreatePrivateChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await chatApi.createPrivateChat(userId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Chat created");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to start chat");
    },
  });
};

export const useCreateGroupChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; participantIds: string[] }) => {
      const response = await chatApi.createGroupChat(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Group created");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create group");
    },
  });
};

export const useAddParticipants = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      chatId,
      userIds,
    }: {
      chatId: string;
      userIds: string[];
    }) => {
      const response = await chatApi.addParticipants(chatId, userIds);
      return response.data;
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to add participants",
      );
    },
  });
};

export const useRemoveParticipant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      chatId,
      userId,
    }: {
      chatId: string;
      userId: string;
    }) => {
      const response = await chatApi.removeParticipant(chatId, userId);
      return response.data;
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to remove participant",
      );
    },
  });
};

// ---------- Reactions ----------

export const useAddReaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      const response = await chatApi.addReaction(messageId, emoji);
      return response.data;
    },
    onSuccess: (reaction) => {
      queryClient.setQueriesData<Message[]>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === reaction.messageId
              ? {
                  ...m,
                  reactions: [
                    ...m.reactions.filter(
                      (r: any) => r.userId !== reaction.userId,
                    ),
                    reaction,
                  ],
                }
              : m,
          );
        },
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add reaction");
    },
  });
};

export const useRemoveReaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      await chatApi.removeReaction(messageId, emoji);
    },
    onSuccess: (_, { messageId, emoji }) => {
      queryClient.setQueriesData<Message[]>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: m.reactions.filter((r: any) => r.emoji !== emoji),
                }
              : m,
          );
        },
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to remove reaction");
    },
  });
};

export const useMarkRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      chatId,
      messageId,
    }: {
      chatId: string;
      messageId: string;
    }) => {
      const response = await chatApi.markRead(chatId, messageId);
      return response.data;
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
};

export const useSearchMessages = (chatId: string, query: string) => {
  return useQuery({
    queryKey: ["search-messages", chatId, query],
    queryFn: async () => {
      const response = await chatApi.searchMessages(chatId, query);
      return response.data;
    },
    enabled: !!chatId && query.trim().length > 0,
  });
};

// ============ WEBSOCKET HOOK ============

// ✅ HARDCODE THE URL - THIS IS THE SIMPLEST FIX
const SOCKET_URL = "http://localhost:3000";
console.log("🔌 Socket URL:", SOCKET_URL);

export const useChatSocket = (
  chatId: string | null,
  userId: string,
  options?: {
    onNewMessage?: (message: Message) => void;
    onMessageDeleted?: (data: { messageId: string; userId: string }) => void;
    onMessageEdited?: (message: Message) => void;
    onReaction?: (reaction: Reaction) => void;
  },
) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ ADD THESE REFS
  const isConnectingRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  const getToken = useCallback(() => {
    try {
      let token =
        localStorage.getItem("accessToken") || localStorage.getItem("token");

      if (token && token !== "undefined" && token !== "null") {
        return token;
      }

      token =
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token");

      if (token && token !== "undefined" && token !== "null") {
        return token;
      }

      const cookies = document.cookie.split("; ");
      for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name === "accessToken" || name === "token") {
          if (value && value !== "undefined" && value !== "null") {
            return value;
          }
        }
      }

      return null;
    } catch (e) {
      console.warn("⚠️ Error getting token:", e);
      return null;
    }
  }, []);

  // ✅ Effect for joining/leaving rooms (does NOT reconnect)
  useEffect(() => {
    if (!socketRef.current || !isConnected || !chatId) return;

    console.log(`📚 Joining chat room: ${chatId}`);
    socketRef.current.emit("chat:join", { chatId });

    return () => {
      if (socketRef.current && isConnected) {
        console.log(`📚 Leaving chat room: ${chatId}`);
        socketRef.current.emit("chat:leave", { chatId });
      }
    };
  }, [chatId, isConnected]);

  // ✅ MAIN SOCKET CONNECTION - ONLY RUNS ONCE
  useEffect(() => {
    if (!userId) {
      console.log("⏳ Waiting for userId to connect socket");
      return;
    }

    // ✅ Prevent multiple connection attempts
    if (isConnectingRef.current) {
      console.log("⏳ Already connecting, skipping...");
      return;
    }

    // ✅ Skip if already connected
    if (socketRef.current && socketRef.current.connected) {
      console.log("✅ Socket already connected, skipping...");
      return;
    }

    isConnectingRef.current = true;

    const token = getToken();
    console.log("🔑 Token retrieved:", token ? "✅ Present" : "❌ Missing");

    const socketUrl = "http://localhost:3000";
    console.log(`🔌 Connecting to: ${socketUrl}/chat`);

    const s = io(`${socketUrl}/chat`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token: token || undefined,
      },
      query: {
        userId: userId,
        token: token || undefined,
      },
    });

    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      console.log("✅ Connected to chat socket", s.id);
      setIsConnected(true);
      setReconnectAttempts(0);
      isConnectingRef.current = false;

      if (chatId) {
        console.log(`📚 Joining chat room: ${chatId}`);
        s.emit("chat:join", { chatId });
      }
    });

    s.on("disconnect", (reason) => {
      console.log(`❌ Disconnected from chat socket: ${reason}`);
      setIsConnected(false);

      if (reason === "io server disconnect") {
        console.log("🔄 Server disconnected, attempting to reconnect...");
        setTimeout(() => {
          if (s.disconnected) {
            s.connect();
          }
        }, 1000);
      }
    });

    s.on("connect_error", (err) => {
      console.error("❌ Chat socket connection error:", err.message);
      setIsConnected(false);
      setReconnectAttempts((prev) => prev + 1);
      isConnectingRef.current = false;

      if (reconnectAttempts >= 5) {
        toast.error(
          "Failed to connect to chat server. Please refresh the page.",
        );
      }
    });

    s.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setReconnectAttempts(0);
      isConnectingRef.current = false;
    });

    s.on("reconnect_failed", () => {
      console.error("❌ All reconnection attempts failed");
      toast.error(
        "Unable to connect to chat server. Please check your connection.",
      );
      isConnectingRef.current = false;
    });

    s.on("connection:established", (data) => {
      console.log("✅ Connection established:", data);
      setIsConnected(true);
      isConnectingRef.current = false;
    });

    // ---------- Message Events ----------
    s.on("message:new", (message: Message) => {
      console.log("📩 New message received:", message);

      if (options?.onNewMessage) {
        options.onNewMessage(message);
      }

      const queryKey = message.chatId
        ? ["messages", message.chatId]
        : message.communityId
          ? ["community-messages", message.communityId]
          : null;

      if (queryKey) {
        queryClient.setQueryData<Message[]>(queryKey, (old) => {
          if (!old) return [message];
          if (old.some((m) => m.id === message.id)) return old;
          return [...old, message];
        });
      }
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    });

    s.on("message:sent", (message: Message) => {
      console.log("✅ Message sent confirmation:", message);
    });

    s.on(
      "message:deleted",
      (data: {
        messageId: string;
        userId: string;
        chatId?: string;
        communityId?: string;
      }) => {
        console.log("🗑️ Message deleted:", data);

        if (options?.onMessageDeleted) {
          options.onMessageDeleted(data);
        }

        const queryKey = data.chatId
          ? ["messages", data.chatId]
          : data.communityId
            ? ["community-messages", data.communityId]
            : null;

        if (queryKey) {
          queryClient.setQueryData<Message[]>(queryKey, (old) => {
            if (!old) return old;
            return old.map((m) =>
              m.id === data.messageId
                ? { ...m, isDeleted: true, content: "Message deleted" }
                : m,
            );
          });
        }
      },
    );

    s.on("message:edited", (message: Message) => {
      console.log("✏️ Message edited:", message);

      if (options?.onMessageEdited) {
        options.onMessageEdited(message);
      }

      const queryKey = message.chatId
        ? ["messages", message.chatId]
        : message.communityId
          ? ["community-messages", message.communityId]
          : null;

      if (queryKey) {
        queryClient.setQueryData<Message[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === message.id
              ? { ...m, content: message.content, isEdited: true }
              : m,
          );
        });
      }
    });

    s.on(
      "message:pinned",
      (data: { messageId: string; pinned: boolean; userId: string }) => {
        console.log("📌 Message pinned:", data);
        queryClient.setQueriesData<Message[]>(
          { queryKey: ["messages"] },
          (old) => {
            if (!old) return old;
            return old.map((m) =>
              m.id === data.messageId ? { ...m, isPinned: data.pinned } : m,
            );
          },
        );
      },
    );

    // ---------- Reaction Events ----------
    s.on("reaction:new", (reaction: Reaction) => {
      console.log("❤️ New reaction:", reaction);

      if (options?.onReaction) {
        options.onReaction(reaction);
      }

      if (!reaction?.messageId) return;
      queryClient.setQueriesData<Message[]>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === reaction.messageId
              ? {
                  ...m,
                  reactions: [
                    ...m.reactions.filter(
                      (r: any) => r.userId !== reaction.userId,
                    ),
                    reaction,
                  ],
                }
              : m,
          );
        },
      );
    });

    s.on(
      "reaction:removed",
      (data: { messageId: string; userId: string; emoji: string }) => {
        console.log("💔 Reaction removed:", data);
        queryClient.setQueriesData<Message[]>(
          { queryKey: ["messages"] },
          (old) => {
            if (!old) return old;
            return old.map((m) =>
              m.id === data.messageId
                ? {
                    ...m,
                    reactions: m.reactions.filter(
                      (r: any) =>
                        r.emoji !== data.emoji || r.userId !== data.userId,
                    ),
                  }
                : m,
            );
          },
        );
      },
    );

    s.on("reaction:error", (data: { error: string }) => {
      toast.error(data.error || "Failed to add reaction");
    });

    // ---------- Read Receipts ----------
    s.on(
      "message:read",
      (data: { userId: string; messageId: string; chatId: string }) => {
        console.log("👀 Message read:", data);
      },
    );

    // ---------- Typing Events ----------
    s.on(
      "typing:start",
      (data: { userId: string; chatId: string; communityId?: string }) => {
        const targetId = data.chatId || data.communityId;
        if (targetId === chatId && data.userId !== userId) {
          setTypingUsers((prev) => new Set(prev).add(data.userId));
        }
      },
    );

    s.on(
      "typing:stop",
      (data: { userId: string; chatId: string; communityId?: string }) => {
        const targetId = data.chatId || data.communityId;
        if (targetId === chatId) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(data.userId);
            return next;
          });
        }
      },
    );

    // ---------- Presence Events ----------
    s.on("user:online", (data: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
    });

    s.on("user:offline", (data: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    s.on("users:online", (data: { users: string[] }) => {
      setOnlineUsers(new Set(data.users));
    });

    // ---------- Message Errors ----------
    s.on("message:error", (data: { error: string }) => {
      toast.error(data.error || "Message failed to send");
    });

    s.on("error", (data: { message: string }) => {
      console.error("Socket error:", data);
      toast.error(data.message || "Socket error occurred");
    });

    // ✅ CLEANUP - only runs when userId changes
    return () => {
      console.log("🧹 Cleaning up socket connection");
      isConnectingRef.current = false;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      setSocket(null);
      setIsConnected(false);
    };
  }, [userId]); // ✅ ONLY DEPENDS ON userId

  // ---------- Socket Actions ----------
  const sendMessage = useCallback(
    (
      payload: Omit<SendMessagePayload, "chatId" | "communityId"> & {
        chatId?: string;
        communityId?: string;
      },
    ) => {
      if (!socketRef.current || !isConnected) {
        toast.error("Not connected to chat server");
        return;
      }

      const finalPayload = {
        ...payload,
        chatId: payload.chatId || chatId || undefined,
      };

      console.log("📤 Sending message via socket:", finalPayload);
      socketRef.current.emit("message:send", finalPayload);
    },
    [isConnected, chatId],
  );

  const sendVoiceMessage = useCallback(
    (payload: {
      chatId?: string;
      communityId?: string;
      audioUrl: string;
      duration: number;
    }) => {
      if (!socketRef.current || !isConnected) {
        toast.error("Not connected to chat server");
        return;
      }

      const finalPayload = {
        ...payload,
        chatId: payload.chatId || chatId || undefined,
      };

      socketRef.current.emit("voice:message:send", finalPayload);
    },
    [isConnected, chatId],
  );

  const sendTyping = useCallback(
    (isTyping: boolean, targetId?: string, isCommunity: boolean = false) => {
      if (!socketRef.current || !isConnected) return;

      const id = targetId || chatId;
      if (!id) return;

      const event = isTyping ? "typing:start" : "typing:stop";
      const payload = isCommunity ? { communityId: id } : { chatId: id };

      socketRef.current.emit(event, payload);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          if (socketRef.current && isConnected) {
            socketRef.current.emit("typing:stop", payload);
          }
        }, 3000);
      }
    },
    [isConnected, chatId],
  );

  const emitRead = useCallback(
    (messageId: string, targetId?: string, isCommunity: boolean = false) => {
      if (!socketRef.current || !isConnected) return;

      const id = targetId || chatId;
      if (!id) return;

      const payload = isCommunity
        ? { communityId: id, messageId }
        : { chatId: id, messageId };

      socketRef.current.emit("message:read", payload);
    },
    [isConnected, chatId],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!socketRef.current || !isConnected) {
        toast.error("Not connected to chat server");
        return;
      }
      socketRef.current.emit("message:delete", { messageId });
    },
    [isConnected],
  );

  const editMessage = useCallback(
    (messageId: string, content: string) => {
      if (!socketRef.current || !isConnected) {
        toast.error("Not connected to chat server");
        return;
      }
      socketRef.current.emit("message:edit", { messageId, content });
    },
    [isConnected],
  );

  const pinMessage = useCallback(
    (messageId: string, pinned: boolean) => {
      if (!socketRef.current || !isConnected) {
        toast.error("Not connected to chat server");
        return;
      }
      socketRef.current.emit("message:pin", { messageId, pinned });
    },
    [isConnected],
  );

  const fetchMessages = useCallback(
    (params: {
      chatId?: string;
      communityId?: string;
      limit?: number;
      before?: string;
    }) => {
      if (!socketRef.current || !isConnected) {
        toast.error("Not connected to chat server");
        return;
      }
      socketRef.current.emit("messages:fetch", params);
    },
    [isConnected],
  );

  const joinChat = useCallback(
    (chatIdToJoin: string) => {
      if (!socketRef.current || !isConnected) {
        toast.error("Not connected to chat server");
        return;
      }
      socketRef.current.emit("chat:join", { chatId: chatIdToJoin });
    },
    [isConnected],
  );

  const leaveChat = useCallback(
    (chatIdToLeave: string) => {
      if (!socketRef.current || !isConnected) return;
      socketRef.current.emit("chat:leave", { chatId: chatIdToLeave });
    },
    [isConnected],
  );

  return {
    socket: socketRef.current,
    isConnected,
    typingUsers,
    onlineUsers,
    sendMessage,
    sendVoiceMessage,
    sendTyping,
    emitRead,
    deleteMessage,
    editMessage,
    pinMessage,
    fetchMessages,
    joinChat,
    leaveChat,
    reconnectAttempts,
  };
};

// ============ VOICE MESSAGE RECORDING HOOK ============

export const useVoiceMessageRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

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

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        chunksRef.current = [];
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to access microphone. Please check permissions.");
      throw error;
    }
  };

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(new Blob());
        return;
      }

      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const checkBlob = setInterval(() => {
        if (audioBlob) {
          clearInterval(checkBlob);
          resolve(audioBlob);
        } else {
          setTimeout(() => {
            clearInterval(checkBlob);
            resolve(new Blob());
          }, 2000);
        }
      }, 100);
    });
  }, [audioBlob]);

  const cancelRecording = useCallback(() => {
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setDuration(0);
    setAudioBlob(null);
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
