import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@Controller('keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post('create')
  async create(@Body() createDto: CreateApiKeyDto, @CurrentUser() user: any) {
    return this.apiKeysService.create(createDto, user.userId);
  }

  @Post('rollover')
  async rollover(
    @Body() rolloverDto: RolloverApiKeyDto,
    @CurrentUser() user: any,
  ) {
    return this.apiKeysService.rollover(rolloverDto, user.userId);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.apiKeysService.findAll(user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.apiKeysService.findOne(id, user.userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateApiKeyDto,
    @CurrentUser() user: any,
  ) {
    return this.apiKeysService.update(id, updateDto, user.userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.apiKeysService.delete(id, user.userId);
  }

  @Get(':id/stats')
  async getStats(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.apiKeysService.getUsageStats(id, user.userId, days || 7);
  }

  @Get(':id/logs')
  async getLogs(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.apiKeysService.getRecentLogs(id, user.userId, limit || 50);
  }
}
