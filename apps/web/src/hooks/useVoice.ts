import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api/client";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  Room,
  RoomEvent,
  Track,
  LocalAudioTrack,
  RemoteAudioTrack,
  Participant,
} from "livekit-client";

// ---------- Types ----------
export interface VoiceRoom {
  id: string;
  name: string;
  description?: string;
  type: "OPEN" | "PRIVATE" | "SCHEDULED" | "STAGE";
  status: "WAITING" | "ACTIVE" | "ENDED";
  creatorId: string;
  creator: { id: string; name: string; avatarUrl?: string };
  scheduledFor?: string;
  maxParticipants: number;
  isRecording: boolean;
  participants: VoiceParticipant[];
  recordings: Recording[];
  stages: Stage[];
  createdAt: string;
}

export interface VoiceParticipant {
  id: string;
  userId: string;
  user: { id: string; name: string; avatarUrl?: string };
  role: "SPEAKER" | "LISTENER" | "STAGE_SPEAKER" | "MODERATOR";
  isMuted: boolean;
  isDeafened: boolean;
  raisedHand: boolean;
  joinedAt: string;
}

export interface Recording {
  id: string;
  url: string;
  duration: number;
  size: number;
  transcript?: string;
  createdAt: string;
}

export interface Stage {
  id: string;
  name: string;
  speakers: string[];
}

// ---------- API ----------

export const voiceApi = {
  getRooms: (params?: { type?: string; status?: string }) =>
    apiClient.get<VoiceRoom[]>("/voice/rooms", { params }),
  getRoom: (roomId: string) =>
    apiClient.get<VoiceRoom>(`/voice/rooms/${roomId}`),
  createRoom: (data: any) => apiClient.post<VoiceRoom>("/voice/rooms", data),
  updateRoom: (roomId: string, data: any) =>
    apiClient.put(`/voice/rooms/${roomId}`, data),
  endRoom: (roomId: string) => apiClient.post(`/voice/rooms/${roomId}/end`),
  joinRoom: (roomId: string) =>
    apiClient.post<{ token: string }>(`/voice/rooms/${roomId}/join`),
  leaveRoom: (roomId: string) => apiClient.post(`/voice/rooms/${roomId}/leave`),
  updateRole: (roomId: string, userId: string, role: string) =>
    apiClient.put(`/voice/rooms/${roomId}/role/${userId}`, { role }),
  addToStage: (roomId: string, userId: string) =>
    apiClient.post(`/voice/rooms/${roomId}/stage/add/${userId}`),
  removeFromStage: (roomId: string, userId: string) =>
    apiClient.post(`/voice/rooms/${roomId}/stage/remove/${userId}`),
  getRecordings: (roomId: string) =>
    apiClient.get(`/voice/rooms/${roomId}/recordings`),
};

// ---------- Hooks ----------

export const useVoiceRooms = (filters?: { type?: string; status?: string }) => {
  return useQuery({
    queryKey: ["voice-rooms", filters],
    queryFn: async () => {
      const response = await voiceApi.getRooms(filters);
      return response.data;
    },
  });
};

export const useVoiceRoom = (roomId: string) => {
  return useQuery({
    queryKey: ["voice-room", roomId],
    queryFn: async () => {
      const response = await voiceApi.getRoom(roomId);
      return response.data;
    },
    enabled: !!roomId,
  });
};

export const useCreateVoiceRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await voiceApi.createRoom(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-rooms"] });
      toast.success("Room created!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create room");
    },
  });
};

export const useJoinVoiceRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const response = await voiceApi.joinRoom(roomId);
      return response.data;
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["voice-room", roomId] });
      toast.success("Joined room!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to join room");
    },
  });
};

export const useEndVoiceRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      await voiceApi.endRoom(roomId);
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["voice-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["voice-room", roomId] });
      toast.success("Room ended");
    },
  });
};

// ---------- Socket Hook (UPDATED PORT to 3000) ----------
export const useVoiceSocket = (roomId: string, userId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 👇 Don't connect until we actually have both values
    if (!roomId || !userId) return;

    const s = io('http://localhost:3000/voice', {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
    });

    s.on('connect', () => {
      console.log('Connected to voice socket');
      setIsConnected(true);
      s.emit('voice:join', { roomId, userId });
    });

    s.on('disconnect', () => {
      console.log('Disconnected from voice socket');
      setIsConnected(false);
    });

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      toast.error('Failed to connect to voice server');
    });

    s.on('voice:error', (err: { message: string }) => {
      console.error('Voice gateway error:', err.message);
      toast.error(err.message);
    });

    s.on('voice:participants', (data: { participants: string[] }) => {
      setParticipants(data.participants);
    });

    s.on('participant:joined', (data: { userId: string }) => {
      setParticipants((prev) => [...prev, data.userId]);
    });

    s.on('participant:left', (data: { userId: string }) => {
      setParticipants((prev) => prev.filter((id) => id !== data.userId));
    });

    s.on('voice:hand-raised', (data: { userId: string; raised: boolean }) => {
      // Handle hand raised event
    });

    setSocket(s);

    return () => {
      s.emit('voice:leave', { roomId, userId });
      s.disconnect();
    };
  }, [roomId, userId]);

  return { socket, participants, isConnected };
};

// ---------- LiveKit Hook (unchanged) ----------
export const useLiveKitRoom = (
  roomName: string,
  token: string | null,
  options?: { onTrackSubscribed?: (track: any) => void },
) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [localTrack, setLocalTrack] = useState<LocalAudioTrack | null>(null);
  const [remoteTracks, setRemoteTracks] = useState<RemoteAudioTrack[]>([]);

  useEffect(() => {
    if (!token || !roomName) return;

    const livekitRoom = new Room({
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true },
    });

    setRoom(livekitRoom);

    const connect = async () => {
      try {
        await livekitRoom.connect("wss://localhost:7880", token);
        const local =
          await livekitRoom.localParticipant.setMicrophoneEnabled(true);
        setLocalTrack(local);

        livekitRoom.on(RoomEvent.TrackSubscribed, (track: any) => {
          if (track.kind === "audio") {
            setRemoteTracks((prev) => [...prev, track]);
          }
        });

        livekitRoom.on(RoomEvent.TrackUnsubscribed, (track: any) => {
          if (track.kind === "audio") {
            setRemoteTracks((prev) => prev.filter((t) => t !== track));
          }
        });

        if (options?.onTrackSubscribed) {
          livekitRoom.on(RoomEvent.TrackSubscribed, options.onTrackSubscribed);
        }
      } catch (error) {
        console.error("LiveKit connection error:", error);
      }
    };

    connect();

    return () => {
      livekitRoom.disconnect();
    };
  }, [token, roomName]);

  return { room, localTrack, remoteTracks };
};

export const useAddToStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roomId,
      userId,
    }: {
      roomId: string;
      userId: string;
    }) => {
      const response = await voiceApi.addToStage(roomId, userId);
      return response.data;
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ["voice-room", roomId] });
    },
  });
};

export const useRemoveFromStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roomId,
      userId,
    }: {
      roomId: string;
      userId: string;
    }) => {
      const response = await voiceApi.removeFromStage(roomId, userId);
      return response.data;
    },
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ["voice-room", roomId] });
    },
  });
};