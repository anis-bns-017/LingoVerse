import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import { toast } from 'sonner';

export interface Community {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  type: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
  ownerId: string;
  owner: { id: string; name: string; email: string; avatarUrl?: string };
  members: CommunityMember[];
  channels: Channel[];
  roles: CommunityRole[];
  bans: CommunityBan[];
  _count?: { members: number; channels: number };
  createdAt: string;
}

export interface CommunityMember {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string; avatarUrl?: string };
  role: string;
  joinedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'TEXT' | 'VOICE' | 'ANNOUNCEMENT' | 'CATEGORY';
  parentId?: string;
  position: number;
  threads?: Thread[];
}

export interface Thread {
  id: string;
  title: string;
  content?: string;
  authorId: string;
  author: { id: string; name: string; avatarUrl?: string };
  isLocked: boolean;
  isPinned: boolean;
  createdAt: string;
  messages: ThreadMessage[];
  _count?: { messages: number };
}

export interface ThreadMessage {
  id: string;
  authorId: string;
  author: { id: string; name: string; avatarUrl?: string };
  content: string;
  createdAt: string;
}

export interface CommunityRole {
  id: string;
  name: string;
  color?: string;
  permissions: string[];
  position: number;
}

export interface CommunityBan {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string; avatarUrl?: string };
  reason?: string;
  expiresAt?: string;
  createdAt: string;
}

// ---------- API ----------

export const communityApi = {
  getCommunities: () => apiClient.get<{ owned: Community[]; joined: Community[]; recommended: Community[] }>('/communities'),
  getCommunity: (communityId: string) => apiClient.get<Community>(`/communities/${communityId}`),
  createCommunity: (data: any) => apiClient.post<Community>('/communities', data),
  updateCommunity: (communityId: string, data: any) => apiClient.put<Community>(`/communities/${communityId}`, data),
  deleteCommunity: (communityId: string) => apiClient.delete(`/communities/${communityId}`),

  createChannel: (communityId: string, data: any) => apiClient.post<Channel>(`/communities/${communityId}/channels`, data),
  updateChannel: (communityId: string, channelId: string, data: any) => apiClient.put<Channel>(`/communities/${communityId}/channels/${channelId}`, data),
  deleteChannel: (communityId: string, channelId: string) => apiClient.delete(`/communities/${communityId}/channels/${channelId}`),

  createThread: (channelId: string, data: any) => apiClient.post<Thread>(`/communities/channels/${channelId}/threads`, data),
  getThreads: (channelId: string) => apiClient.get<Thread[]>(`/communities/channels/${channelId}/threads`),
  getThread: (threadId: string) => apiClient.get<Thread>(`/communities/threads/${threadId}`),

  joinCommunity: (communityId: string) => apiClient.post(`/communities/${communityId}/join`),
  leaveCommunity: (communityId: string) => apiClient.post(`/communities/${communityId}/leave`),
  addMember: (communityId: string, data: { userId: string; role?: string }) => apiClient.post(`/communities/${communityId}/members`, data),
  removeMember: (communityId: string, userId: string) => apiClient.delete(`/communities/${communityId}/members/${userId}`),
  updateMemberRole: (communityId: string, userId: string, data: { role: string }) => apiClient.put(`/communities/${communityId}/members/${userId}/role`, data),

  createRole: (communityId: string, data: any) => apiClient.post<CommunityRole>(`/communities/${communityId}/roles`, data),
  updateRole: (communityId: string, roleId: string, data: any) => apiClient.put<CommunityRole>(`/communities/${communityId}/roles/${roleId}`, data),
  deleteRole: (communityId: string, roleId: string) => apiClient.delete(`/communities/${communityId}/roles/${roleId}`),

  banMember: (communityId: string, data: { userId: string; reason?: string; expiresAt?: string }) => apiClient.post(`/communities/${communityId}/bans`, data),
  unbanMember: (communityId: string, userId: string) => apiClient.delete(`/communities/${communityId}/bans/${userId}`),

  createInvite: (communityId: string, data?: { maxUses?: number; expiresAt?: string }) => apiClient.post(`/communities/${communityId}/invites`, data || {}),
  joinByInvite: (code: string) => apiClient.post(`/communities/join/${code}`),
};

// ---------- Hooks ----------

export const useCommunities = () => {
  return useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const response = await communityApi.getCommunities();
      return response.data;
    },
  });
};

export const useCommunity = (communityId: string) => {
  return useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => {
      const response = await communityApi.getCommunity(communityId);
      return response.data;
    },
    enabled: !!communityId,
  });
};

export const useCreateCommunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await communityApi.createCommunity(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success('Community created!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create community');
    },
  });
};

export const useJoinCommunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (communityId: string) => {
      const response = await communityApi.joinCommunity(communityId);
      return response.data;
    },
    onSuccess: (_, communityId) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      toast.success('Joined community!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to join community');
    },
  });
};

export const useLeaveCommunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (communityId: string) => {
      const response = await communityApi.leaveCommunity(communityId);
      return response.data;
    },
    onSuccess: (_, communityId) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      toast.success('Left community');
    },
  });
};

export const useCreateChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ communityId, data }: { communityId: string; data: any }) => {
      const response = await communityApi.createChannel(communityId, data);
      return response.data;
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      toast.success('Channel created');
    },
  });
};

export const useCreateThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, data }: { channelId: string; data: any }) => {
      const response = await communityApi.createThread(channelId, data);
      return response.data;
    },
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['threads', channelId] });
      toast.success('Thread created');
    },
  });
};

export const useThreads = (channelId: string) => {
  return useQuery({
    queryKey: ['threads', channelId],
    queryFn: async () => {
      const response = await communityApi.getThreads(channelId);
      return response.data;
    },
    enabled: !!channelId,
  });
};

export const useThread = (threadId: string) => {
  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      const response = await communityApi.getThread(threadId);
      return response.data;
    },
    enabled: !!threadId,
  });
};

export const useCreateInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ communityId, data }: { communityId: string; data?: any }) => {
      const response = await communityApi.createInvite(communityId, data);
      return response.data;
    },
    onSuccess: (_, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      toast.success('Invite created!');
    },
  });
};

export const useJoinByInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await communityApi.joinByInvite(code);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success('Joined community via invite!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Invalid invite');
    },
  });
};