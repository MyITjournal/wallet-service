import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base-entity';
import { ApiKey } from './api-key.entity';

@Entity('api_key_usage_logs')
export class ApiKeyUsageLog extends BaseEntity {
  @ManyToOne(() => ApiKey, (apiKey) => apiKey.usage_logs, { nullable: false })
  @JoinColumn({ name: 'api_key_id' })
  @Index()
  api_key: ApiKey;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ nullable: true })
  user_agent: string;

  @Column({ default: 200 })
  status_code: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'int', default: 0 })
  response_time_ms: number;

  @Index()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  logged_at: Date;
}
