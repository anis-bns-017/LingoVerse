import { Injectable, Logger } from '@nestjs/common';
import { RoomServiceClient, AccessToken, Room } from 'livekit-server-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);
  private roomService?: RoomServiceClient;
  private host: string;
  private apiKey: string;
  private apiSecret: string;
  private isMockMode = true;

  constructor(private configService: ConfigService) {
    this.host = this.configService.get<string>('LIVEKIT_HOST') || '';
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET') || '';

    // If all required config is present, try to initialise the real client
    if (this.host && this.apiKey && this.apiSecret) {
      try {
        this.roomService = new RoomServiceClient(
          this.host,
          this.apiKey,
          this.apiSecret,
        );
        this.isMockMode = false;
        this.logger.log('LiveKit client initialised in real mode');
      } catch (error) {
        this.logger.warn(
          'Failed to initialise LiveKit client, falling back to mock mode',
          error,
        );
        this.isMockMode = true;
      }
    } else {
      this.logger.warn('LiveKit configuration missing – running in mock mode');
    }
  }

  /**
   * Creates a LiveKit room (or a mock if in mock mode)
   */
  async createRoom(
    name: string,
    maxParticipants: number = 50,
  ): Promise<string> {
    if (this.isMockMode || !this.roomService) {
      this.logger.debug(`[MOCK] Creating room: ${name}`);
      // Return a fake room name that includes the original name and timestamp
      return `mock-${name}-${Date.now()}`;
    }

    try {
      const room = new Room({
        name,
        maxParticipants,
        emptyTimeout: 10 * 60,
        creationTime: BigInt(Date.now()),
      });
      await this.roomService.createRoom(room);
      return name;
    } catch (error) {
      this.logger.error(`Failed to create real LiveKit room: ${name}`, error);
      // Fallback to mock on error – this avoids breaking the whole flow
      this.logger.warn('Falling back to mock mode for this room creation');
      return `mock-fallback-${name}-${Date.now()}`;
    }
  }

  /**
   * Deletes a LiveKit room (or does nothing in mock mode)
   */
  async endRoom(roomName: string): Promise<void> {
    if (this.isMockMode || !this.roomService) {
      this.logger.debug(`[MOCK] Ending room: ${roomName}`);
      return;
    }

    try {
      await this.roomService.deleteRoom(roomName);
    } catch (error: any) {
      if (error?.status === 404 || error?.code === 'not_found') {
        this.logger.debug(
          `Room ${roomName} already gone from LiveKit — nothing to delete`,
        );
        return;
      }
      this.logger.error(`Failed to delete LiveKit room: ${roomName}`, error);
    }
  }
  
  /**
   * Generates a participant token (or a mock token in mock mode)
   */
  async getParticipantToken(
    roomName: string,
    identity: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    if (this.isMockMode || !this.roomService) {
      this.logger.debug(
        `[MOCK] Generating token for ${identity} in ${roomName}`,
      );
      // Return a fake JWT-like string (just for testing)
      return `mock-token-${userId}-${Date.now()}`;
    }

    try {
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
    } catch (error) {
      this.logger.error(
        `Failed to generate token for ${identity} in ${roomName}`,
        error,
      );
      // Fallback to a mock token on error
      return `mock-error-token-${userId}-${Date.now()}`;
    }
  }

  /**
   * Starts recording (mock for now – you can replace with real Egress later)
   */
  async startRecording(_roomName: string): Promise<any> {
    if (this.isMockMode) {
      this.logger.debug(`[MOCK] Starting recording on: ${_roomName}`);
      return { status: 'mocked', room: _roomName };
    }
    // Placeholder for real Egress implementation
    return { status: 'started', room: _roomName };
  }

  /**
   * Stops recording (mock for now)
   */
  async stopRecording(_roomName: string): Promise<any> {
    if (this.isMockMode) {
      this.logger.debug(`[MOCK] Stopping recording on: ${_roomName}`);
      return { status: 'mocked', room: _roomName };
    }
    return { status: 'stopped', room: _roomName };
  }
}
