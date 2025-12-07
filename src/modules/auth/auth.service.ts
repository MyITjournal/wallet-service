import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { User } from '../users/entities/user.entity';
import { UserModelActions } from '../users/actions/user.actions';

@Injectable()
export class AuthService {
  private userActions: UserModelActions;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.userActions = new UserModelActions(userRepository);
  }

  async validateGoogleUser(googleUser: any) {
    const user = await this.userActions.findOrCreateGoogleUser(googleUser);

    const payload = { sub: user.id, email: user.email, name: user.name };
    const access_token = this.jwtService.sign(payload);

    return {
      user_id: user.id,
      email: user.email,
      name: user.name,
      access_token,
    };
  }

  async verifyGoogleToken(googleToken: string) {
    try {
      // Verify Google token by calling Google's tokeninfo endpoint
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${googleToken}`,
      );

      const { email, sub: googleId } = response.data;

      if (!email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      // Find or create user
      const user = await this.userActions.findOrCreateGoogleUser({
        email,
        id: googleId,
        displayName: email.split('@')[0],
        photos: [],
      });

      // Generate our JWT token
      const payload = { sub: user.id, email: user.email, name: user.name };
      const access_token = this.jwtService.sign(payload);

      return {
        user_id: user.id,
        email: user.email,
        name: user.name,
        access_token,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired Google token');
    }
  }
}
