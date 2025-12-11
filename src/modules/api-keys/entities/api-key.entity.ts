import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base-entity';
import { User } from '../../users/entities/user.entity';
import { ApiKeyUsageLog } from './api-key-usage-log.entity';

@Entity('api_keys')
export class ApiKey extends BaseEntity {
  @Column({ unique: true })
  @Index()
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_used_at: Date;

  @Column({ type: 'json', default: '[]' })
  permissions: string[];

  @Column({ default: 100 })
  rate_limit_per_hour: number;

  @Column({ default: 1000 })
  rate_limit_per_day: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  ip_whitelist: string;

  @OneToMany(() => ApiKeyUsageLog, (log) => log.api_key)
  usage_logs: ApiKeyUsageLog[];

  // Check if key is expired
  isExpired(): boolean {
    if (!this.expires_at) return false;
    return new Date() > this.expires_at;
  }

  // Check if key has permission
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }
}
