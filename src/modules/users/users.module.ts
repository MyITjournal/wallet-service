import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserModelActions } from './model-actions/user.model-actions';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserModelActions],
  exports: [TypeOrmModule, UserModelActions],
})
export class UsersModule {}
