import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExceptionType, ExceptionStatus } from '../common/enums';
import { DeliveryTask } from './delivery-task.entity';
import { User } from './user.entity';

@Entity('delivery_exceptions')
export class DeliveryException {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DeliveryTask)
  @JoinColumn({ name: 'taskId' })
  task: DeliveryTask;

  @Column()
  taskId: number;

  @Column({ type: 'enum', enum: ExceptionType })
  type: ExceptionType;

  @Column({ type: 'text', nullable: true })
  description: string;

  /** 上报人（志愿者） */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reportedById' })
  reportedBy: User;

  @Column({ nullable: true })
  reportedById: number;

  @Column({ type: 'enum', enum: ExceptionStatus, default: ExceptionStatus.PENDING })
  status: ExceptionStatus;

  /** 处理人（社区工作人员） */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'handlerId' })
  handler: User;

  @Column({ nullable: true })
  handlerId: number;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
