import { Injectable } from '@nestjs/common';
import { RoomServiceClient, AccessToken, Room } from 'livekit-server-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LiveKitService {
  private roomService: RoomServiceClient;
  private host: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(private configService: ConfigService) {
    this.host = this.configService.get<string>('LIVEKIT_HOST', '');
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY', '');
    this.apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET', '');
    this.roomService = new RoomServiceClient(
      this.host,
      this.apiKey,
      this.apiSecret,
    );
  }

  async createRoom(
    name: string,
    maxParticipants: number = 50,
  ): Promise<string> {
    const room = new Room({
      name,
      maxParticipants,
      emptyTimeout: 10 * 60, // 10 minutes
      creationTime: BigInt(new Date().getTime()),
    });
    await this.roomService.createRoom(room);
    return name;
  }

  async endRoom(roomName: string): Promise<void> {
    await this.roomService.deleteRoom(roomName);
  }

  async getParticipantToken(
    roomName: string,
    identity: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      ttl: '1h',
      metadata: JSON.stringify(metadata || { userId }),
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
    return at.toJwt();
  }

  async startRecording(_roomName: string): Promise<any> {
    // Use LiveKit Egress for recording
    // For simplicity, we'll just return a placeholder
    return Promise.resolve({ status: 'started' });
  }

  async stopRecording(_roomName: string): Promise<any> {
    return Promise.resolve({ status: 'stopped' });
  }
}
