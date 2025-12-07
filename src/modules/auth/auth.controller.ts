import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  InternalServerErrorException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { SYS_MESSAGES } from '../../common/constants/sys-messages';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport AuthGuard automatically handles 302 redirect to Google OAuth consent page
    // Any errors will be caught by exception filters
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req,
    @Res() res: Response,
    @Query('code') code?: string,
  ) {
    // Check if code is present (Passport handles this, but we validate for spec compliance)
    if (!code) {
      throw new BadRequestException(SYS_MESSAGES.MISSING_AUTH_CODE);
    }

    // If req.user is not set, it means OAuth validation failed
    if (!req.user) {
      throw new InternalServerErrorException(SYS_MESSAGES.OAUTH_PROVIDER_ERROR);
    }

    try {
      const user = await this.authService.validateGoogleUser(req.user);
      return res.status(HttpStatus.OK).json({
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        access_token: user.access_token,
      });
    } catch (error) {
      throw new InternalServerErrorException(SYS_MESSAGES.OAUTH_PROVIDER_ERROR);
    }
  }

  @Post('google/token')
  async exchangeGoogleToken(@Body('access_token') accessToken: string) {
    if (!accessToken) {
      throw new BadRequestException('Google access token is required');
    }

    return await this.authService.verifyGoogleToken(accessToken);
  }
}
