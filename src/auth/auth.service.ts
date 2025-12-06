import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async validateGoogleUser(googleUser: any) {
    let user: User | null = await this.userRepository.findOne({
      where: { google_id: googleUser.google_id },
    });

    if (!user) {
      const newUser = this.userRepository.create(googleUser);
      const saved = await this.userRepository.save(newUser);
      user = Array.isArray(saved) ? saved[0] : saved;
    } else {
      // Update user info
      user.name = googleUser.name;
      user.picture = googleUser.picture;
      const saved = await this.userRepository.save(user);
      user = Array.isArray(saved) ? saved[0] : saved;
    }

    if (!user) {
      throw new Error('Failed to create or update user');
    }

    return {
      user_id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
