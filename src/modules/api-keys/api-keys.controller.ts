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
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/interfaces/jwt.interface';
import {
  ApiApiKeysTags,
  ApiApiKeysBearerAuth,
  ApiCreateApiKey,
  ApiRolloverApiKey,
} from './docs/api-keys-docs.decorator';

@Controller('keys')
@UseGuards(JwtAuthGuard)
@ApiApiKeysTags()
@ApiApiKeysBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post('create')
  @ApiCreateApiKey()
  async create(
    @Body() createDto: CreateApiKeyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.apiKeysService.create(createDto, user.userId);
  }

  @Post('rollover')
  @ApiRolloverApiKey()
  async rollover(
    @Body() rolloverDto: RolloverApiKeyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.apiKeysService.rollover(rolloverDto, user.userId);
  }

  @Get()
  @ApiExcludeEndpoint()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.apiKeysService.findAll(user.userId);
  }

  @Get(':id')
  @ApiExcludeEndpoint()
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.apiKeysService.findOne(id, user.userId);
  }

  @Put(':id')
  @ApiExcludeEndpoint()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateApiKeyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.apiKeysService.update(id, updateDto, user.userId);
  }

  @Delete(':id')
  @ApiExcludeEndpoint()
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.apiKeysService.delete(id, user.userId);
  }

  @Get(':id/stats')
  @ApiExcludeEndpoint()
  async getStats(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.apiKeysService.getUsageStats(id, user.userId, days || 7);
  }

  @Get(':id/logs')
  @ApiExcludeEndpoint()
  async getLogs(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.apiKeysService.getRecentLogs(id, user.userId, limit || 50);
  }
}
