import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get('me')
  async getMyProfile(@Request() req) {
    return this.profileService.getProfileByUserId(req.user.id);
  }

  @Put('me')
  async updateMyProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.id, dto);
  }
}