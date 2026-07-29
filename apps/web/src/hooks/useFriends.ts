import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export interface Friend {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUser: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  blocked: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  reason?: string;
  createdAt: string;
}

export interface Suggestion {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  profile?: {
    nativeLanguage?: string;
    learningLanguages?: string[];
    interests?: string[];
  };
}

// ---------- FRIENDS ----------
export const useFriends = (search?: string) => {
  return useQuery({
    queryKey: ['friends', search],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Friend[]; total: number }>('/friends', {
        params: { search },
      });
      return response.data;
    },
  });
};

export const useFriendRequests = () => {
  return useQuery({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      const response = await apiClient.get<FriendRequest[]>('/friends/requests');
      return response.data;
    },
  });
};

export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.post('/friends/requests', { userId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
};

export const useRespondFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { requestId: string; action: 'accept' | 'reject' }) => {
      const response = await apiClient.put('/friends/requests/respond', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
};

export const useSuggestions = () => {
  return useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const response = await apiClient.get<Suggestion[]>('/friends/suggestions');
      return response.data;
    },
  });
};

// ---------- BLOCKING ----------
export const useBlockedUsers = () => {
  return useQuery({
    queryKey: ['blocked'],
    queryFn: async () => {
      const response = await apiClient.get<BlockedUser[]>('/friends/blocked');
      return response.data;
    },
  });
};

export const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { userId: string; reason?: string }) => {
      const response = await apiClient.post('/friends/block', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
};

export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.delete(`/friends/block/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
};