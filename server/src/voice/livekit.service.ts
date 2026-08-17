
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RoomServiceClient, AccessToken, Room } from 'livekit-server-sdk';
import { ConfigService } from '@nestjs/config';

// Define RoomOptions locally since it's not exported by the package
interface RoomOptions {
  name: string;
  maxParticipants?: number;
  emptyTimeout?: number;
  creationTime?: bigint;
  audioCodec?: string;
  videoCodec?: string;
}

@Injectable()
export class LiveKitService implements OnModuleInit {
  private readonly logger = new Logger(LiveKitService.name);
  private roomService?: RoomServiceClient;
  private host: string;
  private apiKey: string;
  private apiSecret: string;
  private isMockMode = true;
  private connectionAttempts = 0;
  private readonly MAX_CONNECTION_ATTEMPTS = 3;

  constructor(private configService: ConfigService) {
    this.host = this.configService.get<string>('LIVEKIT_HOST') || '';
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET') || '';

    this.logger.log(
      `LiveKit Service initialized with host: ${this.host || 'not set'}`,
    );
  }

  async onModuleInit() {
    this.initialiseClient();
  }

  private initialiseClient(): void {
    if (this.host && this.apiKey && this.apiSecret) {
      try {
        this.roomService = new RoomServiceClient(
          this.host,
          this.apiKey,
          this.apiSecret,
        );
        this.isMockMode = false;
        this.logger.log('✅ LiveKit client initialised in REAL mode');
      } catch (error) {
        this.logger.warn(
          '❌ Failed to initialise LiveKit client, falling back to mock mode',
          error,
        );
        this.isMockMode = true;
      }
    } else {
      this.logger.warn(
        `⚠️ LiveKit configuration missing – running in MOCK mode (${this.host ? 'no API keys' : 'no host'})`,
      );
      this.isMockMode = true;
    }
  }

  async retryInitialisation(): Promise<boolean> {
    if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
      this.logger.warn('Max connection attempts reached, staying in mock mode');
      return false;
    }

    this.connectionAttempts++;
    this.logger.log(
      `Retrying LiveKit connection (attempt ${this.connectionAttempts})`,
    );

    const host = this.configService.get<string>('LIVEKIT_HOST') || '';
    const apiKey = this.configService.get<string>('LIVEKIT_API_KEY') || '';
    const apiSecret =
      this.configService.get<string>('LIVEKIT_API_SECRET') || '';

    if (host && apiKey && apiSecret) {
      try {
        this.host = host;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.roomService = new RoomServiceClient(
          this.host,
          this.apiKey,
          this.apiSecret,
        );
        this.isMockMode = false;
        this.logger.log('✅ LiveKit client re-initialised in REAL mode');
        return true;
      } catch (error) {
        this.logger.warn('Failed to re-initialise LiveKit client', error);
        return false;
      }
    }

    return false;
  }

  async createRoom(
    name: string,
    maxParticipants: number = 50,
  ): Promise<string> {
    if (this.isMockMode || !this.roomService) {
      this.logger.debug(`[MOCK] Creating room: ${name}`);
      return `mock-${name}-${Date.now()}`;
    }

    try {
      const roomOptions: RoomOptions = {
        name,
        maxParticipants,
        emptyTimeout: 10 * 60,
        creationTime: BigInt(Date.now()),
        audioCodec: 'opus',
        videoCodec: 'vp8',
      };

      const room = new Room(roomOptions);
      await this.roomService.createRoom(room);
      this.logger.log(`✅ LiveKit room created: ${name}`);
      return name;
    } catch (error: any) {
      if (error?.code === 6 || error?.message?.includes('already exists')) {
        this.logger.warn(`Room ${name} already exists, using existing room`);
        return name;
      }

      this.logger.error(`Failed to create real LiveKit room: ${name}`, error);

      const reinitialised = await this.retryInitialisation();
      if (reinitialised) {
        try {
          const room = new Room({
            name,
            maxParticipants,
            emptyTimeout: 10 * 60,
          });
          await this.roomService!.createRoom(room);
          return name;
        } catch (retryError) {
          this.logger.error(
            `Retry failed for room creation: ${name}`,
            retryError,
          );
        }
      }

      this.logger.warn('⚠️ Falling back to mock mode for this room creation');
      return `mock-fallback-${name}-${Date.now()}`;
    }
  }

  async endRoom(roomName: string): Promise<void> {
    if (this.isMockMode || !this.roomService) {
      this.logger.debug(`[MOCK] Ending room: ${roomName}`);
      return;
    }

    try {
      await this.roomService.deleteRoom(roomName);
      this.logger.log(`✅ LiveKit room ended: ${roomName}`);
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
        canPublishData: true,
        canUpdateOwnMetadata: true,
      });

      const token = at.toJwt();
      this.logger.debug(`✅ Token generated for ${identity} in ${roomName}`);
      return token;
    } catch (error) {
      this.logger.error(
        `Failed to generate token for ${identity} in ${roomName}`,
        error,
      );

      const reinitialised = await this.retryInitialisation();
      if (reinitialised) {
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
        } catch (retryError) {
          this.logger.error(`Retry failed for token generation`, retryError);
        }
      }

      this.logger.warn('⚠️ Falling back to mock token');
      return `mock-error-token-${userId}-${Date.now()}`;
    }
  }

  // ==================== NEW METHOD ====================
  /**
   * Generate a token for a participant to join a room
   * This is a wrapper around getParticipantToken for consistency
   */
  async generateToken(
    userId: string,
    roomName: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    return this.getParticipantToken(
      roomName,
      userId, // identity
      userId, // userId
      metadata || { userId },
    );
  }

  async startRecording(_roomName: string): Promise<any> {
    if (this.isMockMode) {
      this.logger.debug(`[MOCK] Starting recording on: ${_roomName}`);
      return {
        status: 'mocked',
        room: _roomName,
        recordingId: `mock-recording-${Date.now()}`,
        startedAt: new Date().toISOString(),
      };
    }

    this.logger.warn('⚠️ Real recording not implemented yet, using mock');
    return {
      status: 'started',
      room: _roomName,
      recordingId: `recording-${Date.now()}`,
      startedAt: new Date().toISOString(),
    };
  }

  async stopRecording(_roomName: string): Promise<any> {
    if (this.isMockMode) {
      this.logger.debug(`[MOCK] Stopping recording on: ${_roomName}`);
      return {
        status: 'mocked',
        room: _roomName,
        stoppedAt: new Date().toISOString(),
      };
    }

    this.logger.warn('⚠️ Real recording stop not implemented yet, using mock');
    return {
      status: 'stopped',
      room: _roomName,
      stoppedAt: new Date().toISOString(),
    };
  }

  async getRoomInfo(roomName: string): Promise<any> {
    if (this.isMockMode || !this.roomService) {
      this.logger.debug(`[MOCK] Getting info for room: ${roomName}`);
      return {
        name: roomName,
        participants: [],
        active: true,
        mock: true,
      };
    }

    try {
      const rooms = await this.roomService.listRooms();
      const room = rooms.find((r) => r.name === roomName);
      return room || null;
    } catch (error) {
      this.logger.error(`Failed to get room info: ${roomName}`, error);
      return null;
    }
  }

  isConnected(): boolean {
    return !this.isMockMode && !!this.roomService;
  }

  getMode(): 'real' | 'mock' {
    return this.isMockMode ? 'mock' : 'real';
  }

  setMockMode(mock: boolean): void {
    this.isMockMode = mock;
    this.logger.log(`LiveKit mode set to ${mock ? 'MOCK' : 'REAL'}`);
  }
}