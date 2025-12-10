import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Injectable } from '@nestjs/common';
import { AbstractModelAction } from '@hng-sdk/orm';

@Injectable()
export class UserModelActions extends AbstractModelAction<User> {
  constructor(
    @InjectRepository(User)
    userRepository: Repository<User>,
  ) {
    super(userRepository, User);
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.repository.findOne({
      where: { google_id: googleId },
    });
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id: userId },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
    });
  }

  /**
   * Create a new user from Google data
   */
  async createFromGoogleData(googleData: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }): Promise<User> {
    const userData = {
      google_id: googleData.googleId,
      email: googleData.email,
      name: googleData.name,
      picture: googleData.picture,
    };

    return this.create({
      createPayload: userData,
      transactionOptions: { useTransaction: false },
    });
  }

  /**
   * Update user information
   */
  async updateUserInfo(
    user: User,
    updates: {
      name?: string;
      picture?: string;
    },
  ): Promise<User> {
    if (updates.name) user.name = updates.name;
    if (updates.picture) user.picture = updates.picture;

    return this.save({
      entity: user,
      transactionOptions: { useTransaction: false },
    });
  }
}
