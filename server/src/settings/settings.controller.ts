import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  async getMySettings(@Request() req) {
    return this.settingsService.getSettingsByUserId(req.user.id);
  }

  @Put()
  async updateMySettings(@Request() req, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(req.user.id, dto);
  }
}