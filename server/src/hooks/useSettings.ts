import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export interface Settings {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEffects: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  dailyReminderTime: string[];
  shareActivityWithFriends: boolean;
  showOnlineStatus: boolean;
}

export interface UpdateSettingsData {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  soundEffects?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  dailyReminderTime?: string[];
  shareActivityWithFriends?: boolean;
  showOnlineStatus?: boolean;
}

export const useSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await apiClient.get<Settings>('/settings');
      return response.data;
    },
    retry: 1,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: UpdateSettingsData) => {
      const response = await apiClient.put<Settings>('/settings', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
  };
};