import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base-entity';
import { User } from '../../users/entities/user.entity';
import { TransactionStatus } from '../../../common/enums';

@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ unique: true })
  reference: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ name: 'authorization_url', nullable: true })
  authorization_url: string;

  @Column({ name: 'paid_at', nullable: true })
  paid_at: Date;

  @ManyToOne(() => User, { nullable: true })
  user: User;
}
