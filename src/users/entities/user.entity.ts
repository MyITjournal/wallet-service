import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base-entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  picture!: string;

  @Column({ name: 'google_id', unique: true })
  google_id!: string;
}
