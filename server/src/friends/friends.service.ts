import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SendFriendRequestDto, RespondFriendRequestDto, BlockUserDto } from './dto/friend-request.dto';

@Injectable()
export class FriendsService {
  constructor(private prisma: PrismaService) {}

  // ---------- FRIEND REQUESTS ----------
  async sendFriendRequest(userId: string, dto: SendFriendRequestDto) {
    if (userId === dto.userId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already friends
    const existingFriend = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { fromUserId: userId, toUserId: dto.userId },
          { fromUserId: dto.userId, toUserId: userId },
        ],
      },
    });
    if (existingFriend) {
      throw new ConflictException('Already friends');
    }

    // Check if request already sent
    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromUserId: userId, toUserId: dto.userId },
          { fromUserId: dto.userId, toUserId: userId },
        ],
      },
    });
    if (existingRequest) {
      throw new ConflictException('Friend request already exists');
    }

    return this.prisma.friendRequest.create({
      data: {
        fromUserId: userId,
        toUserId: dto.userId,
      },
    });
  }

  async getFriendRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: {
        toUserId: userId,
        status: 'PENDING',
      },
      include: {
        fromUser: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondFriendRequest(userId: string, dto: RespondFriendRequestDto) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: dto.requestId },
    });
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }
    if (request.toUserId !== userId) {
      throw new BadRequestException('Not authorized to respond to this request');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request already processed');
    }

    if (dto.action === 'accept') {
      await this.prisma.$transaction([
        this.prisma.friendRequest.update({
          where: { id: dto.requestId },
          data: { status: 'ACCEPTED' },
        }),
        this.prisma.friend.create({
          data: {
            fromUserId: request.fromUserId,
            toUserId: request.toUserId,
            status: 'ACCEPTED',
          },
        }),
      ]);
      return { message: 'Friend request accepted' };
    } else if (dto.action === 'reject') {
      await this.prisma.friendRequest.update({
        where: { id: dto.requestId },
        data: { status: 'REJECTED' },
      });
      return { message: 'Friend request rejected' };
    } else {
      throw new BadRequestException('Invalid action');
    }
  }

  // ---------- FRIENDS ----------
  async getFriends(userId: string, search?: string, limit?: number, offset?: number) {
    const where: any = {
      OR: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
    };

    const friends = await this.prisma.friend.findMany({
      where,
      include: {
        fromUser: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        toUser: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      take: limit || 20,
      skip: offset || 0,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.friend.count({ where });

    const items = friends.map((f) => ({
      id: f.id,
      user: f.fromUserId === userId ? f.toUser : f.fromUser,
      createdAt: f.createdAt,
    }));

    if (search) {
      const filtered = items.filter((f) =>
        f.user.name.toLowerCase().includes(search.toLowerCase())
      );
      return { items: filtered, total: filtered.length };
    }

    return { items, total };
  }

  // ---------- BLOCKING ----------
  async blockUser(userId: string, dto: BlockUserDto) {
    if (userId === dto.userId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: dto.userId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('User already blocked');
    }

    // Remove friend if exists
    await this.prisma.friend.deleteMany({
      where: {
        OR: [
          { fromUserId: userId, toUserId: dto.userId },
          { fromUserId: dto.userId, toUserId: userId },
        ],
      },
    });

    return this.prisma.block.create({
      data: {
        blockerId: userId,
        blockedId: dto.userId,
        reason: dto.reason,
      },
    });
  }

  async unblockUser(userId: string, blockedUserId: string) {
    const block = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: blockedUserId,
        },
      },
    });
    if (!block) {
      throw new NotFoundException('Block not found');
    }

    await this.prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: blockedUserId,
        },
      },
    });
    return { message: 'User unblocked' };
  }

  async getBlockedUsers(userId: string) {
    return this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  // ---------- SUGGESTIONS ----------
  async getSuggestions(userId: string) {
    // Get friends' IDs
    const friends = await this.prisma.friend.findMany({
      where: {
        OR: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
    });
    const friendIds = friends.map((f) =>
      f.fromUserId === userId ? f.toUserId : f.fromUserId
    );

    // Get blocked users
    const blocked = await this.prisma.block.findMany({
      where: { blockerId: userId },
    });
    const blockedIds = blocked.map((b) => b.blockedId);

    // Get users who are not friends and not blocked
    return this.prisma.user.findMany({
      where: {
        id: {
          notIn: [userId, ...friendIds, ...blockedIds],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        profile: {
          select: {
            nativeLanguage: true,
            learningLanguages: true,
            interests: true,
          },
        },
      },
      take: 20,
    });
  }
}