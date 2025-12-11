import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { UserModelActions } from '../users/model-actions/user.model-actions';
import { GoogleApiService } from './services/google-api.service';
import { SYS_MESSAGES } from '../../common/constants/sys-messages';
import { GoogleUserData } from '../../common/interfaces/jwt.interface';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private googleApiService: GoogleApiService,
    private userActions: UserModelActions,
  ) {}

  private async findOrCreateGoogleUser(
    googleUser: GoogleUserData,
  ): Promise<User> {
    const googleId = googleUser.google_id;
    const name = googleUser.name;
    const picture = googleUser.picture ?? undefined;

    // Try to find existing user
    let user = await this.userActions.findByGoogleId(googleId);

    if (user) {
      // Update user info if exists
      user = await this.userActions.updateUserInfo(user, { name, picture });
    } else {
      // Create new user
      user = await this.userActions.createFromGoogleData({
        googleId,
        email: googleUser.email,
        name,
        picture,
      });
    }

    if (!user) {
      throw new InternalServerErrorException(
        SYS_MESSAGES.AUTHENTICATION_FAILED,
      );
    }

    return user;
  }

  async validateGoogleUser(googleUser: GoogleUserData) {
    const user = await this.findOrCreateGoogleUser(googleUser);

    // Increment token version to invalidate all previous tokens
    user.token_version += 1;
    await this.userActions.updateUserInfo(user, {});

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      tokenVersion: user.token_version,
    };
    const access_token = this.jwtService.sign(payload);

    return {
      user_id: user.id,
      email: user.email,
      name: user.name,
      access_token,
    };
  }

  // async verifyGoogleToken(googleToken: string) {
  //   // Verify token and get user info from Google
  //   const googleUserInfo = await this.googleApiService.verifyToken(googleToken);

  //   // Find or create user in our database
  //   const user = await this.findOrCreateGoogleUser({
  //     google_id: googleUserInfo.googleId,
  //     email: googleUserInfo.email,
  //     name: googleUserInfo.name,
  //     picture: googleUserInfo.picture,
  //   });

  //   // Increment token version to invalidate all previous tokens
  //   user.token_version += 1;
  //   await this.userActions.updateUserInfo(user, {});

  //   // Generate JWT token
  //   const payload = {
  //     sub: user.id,
  //     email: user.email,
  //     name: user.name,
  //     tokenVersion: user.token_version,
  //   };
  //   const access_token = this.jwtService.sign(payload);

  //   return {
  //     user_id: user.id,
  //     email: user.email,
  //     name: user.name,
  //     access_token,
  //   };
  // }
}
