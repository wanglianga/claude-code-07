import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ElderStatus } from '../common/enums';
import { Elder } from './elder.entity';
import { User } from './user.entity';

@Entity('elder_status_logs')
export class ElderStatusLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Elder)
  @JoinColumn({ name: 'elderId' })
  elder: Elder;

  @Column()
  elderId: number;

  @Column({ type: 'enum', enum: ElderStatus, nullable: true })
  fromStatus: ElderStatus;

  @Column({ type: 'enum', enum: ElderStatus })
  toStatus: ElderStatus;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changedById' })
  changedBy: User;

  @Column({ nullable: true })
  changedById: number;

  @CreateDateColumn()
  createdAt: Date;
}
