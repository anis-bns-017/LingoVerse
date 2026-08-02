import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// ---------- Types ----------
export interface Chat {
  id: string;
  type: 'PRIVATE' | 'GROUP';
  name?: string;
  avatarUrl?: string;
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
  joinedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  content: string;
  type: string;
  mediaUrl?: string;
  fileUrl?: string;
  replyToId?: string;
  replyTo?: Message;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  reactions: Reaction[];
  attachments: Attachment[];
  translations: Translation[];
}

export interface Reaction {
  id: string;
  userId: string;
  emoji: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
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

// ---------- API Calls ----------

export const chatApi = {
  getUserChats: () => apiClient.get<Chat[]>('/chat'),
  getChatById: (chatId: string) => apiClient.get<Chat>(`/chat/${chatId}`),
  getMessages: (chatId: string, params?: { limit?: number; before?: string }) =>
    apiClient.get<Message[]>(`/chat/${chatId}/messages`, { params }),
  sendMessage: (data: any) => apiClient.post<Message>('/chat/messages', data),
  createPrivateChat: (userId: string) => apiClient.post<Chat>(`/chat/private/${userId}`),
  createGroupChat: (data: { name: string; participantIds: string[] }) =>
    apiClient.post<Chat>('/chat/group', data),
  addParticipants: (chatId: string, userIds: string[]) =>
    apiClient.post(`/chat/group/${chatId}/add`, { userIds }),
  removeParticipant: (chatId: string, userId: string) =>
    apiClient.delete(`/chat/group/${chatId}/remove/${userId}`),
  markRead: (chatId: string, messageId: string) =>
    apiClient.put('/chat/messages/read', { chatId, messageId }),
  addReaction: (messageId: string, emoji: string) =>
    apiClient.post('/chat/messages/reaction', { messageId, emoji }),
  searchMessages: (chatId: string, query: string) =>
    apiClient.get(`/chat/search/${chatId}`, { params: { q: query } }),
};

// ---------- Hooks ----------

export const useChats = () => {
  return useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const response = await chatApi.getUserChats();
      return response.data;
    },
  });
};

export const useChat = (chatId: string) => {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const response = await chatApi.getChatById(chatId);
      return response.data;
    },
    enabled: !!chatId,
  });
};

export const useMessages = (chatId: string, limit = 50) => {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      const response = await chatApi.getMessages(chatId, { limit });
      return response.data;
    },
    enabled: !!chatId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await chatApi.sendMessage(data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send message');
    },
  });
};

export const useCreatePrivateChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await chatApi.createPrivateChat(userId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
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
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};

export const useAddReaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const response = await chatApi.addReaction(messageId, emoji);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
};

export const useMarkRead = () => {
  return useMutation({
    mutationFn: async ({ chatId, messageId }: { chatId: string; messageId: string }) => {
      const response = await chatApi.markRead(chatId, messageId);
      return response.data;
    },
  });
};

// ============ WEBSOCKET HOOK ============

export const useChatSocket = (chatId: string, userId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newMessage, setNewMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const s = io('http://localhost:3000/chat', {
      auth: { token },
      transports: ['websocket'],
    });

    setSocket(s);

    s.on('connect', () => {
      console.log('Connected to chat socket');
    });

    s.on('message:new', (message: Message) => {
      if (message.chatId === chatId) {
        setNewMessage(message);
      }
    });

    s.on('typing:start', (data: { userId: string; chatId: string }) => {
      if (data.chatId === chatId && data.userId !== userId) {
        setTypingUsers((prev) => new Set(prev).add(data.userId));
      }
    });

    s.on('typing:stop', (data: { userId: string; chatId: string }) => {
      if (data.chatId === chatId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    });

    s.on('user:online', (data: { userId: string; online: boolean }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (data.online) newSet.add(data.userId);
        else newSet.delete(data.userId);
        return newSet;
      });
    });

    s.on('user:offline', (data: { userId: string }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    return () => {
      s.disconnect();
    };
  }, [chatId, userId]);

  const sendTyping = (isTyping: boolean) => {
    if (!socket) return;
    if (isTyping) {
      socket.emit('typing:start', { chatId });
    } else {
      socket.emit('typing:stop', { chatId });
    }
  };

  const emitRead = (messageId: string) => {
    if (!socket) return;
    socket.emit('message:read', { chatId, messageId });
  };

  return { socket, newMessage, typingUsers, onlineUsers, sendTyping, emitRead };
};