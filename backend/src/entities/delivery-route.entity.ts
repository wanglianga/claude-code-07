import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { RouteStatus, RouteType } from '../common/enums';
import { User } from './user.entity';
import { DeliveryTask } from './delivery-task.entity';

@Entity('delivery_routes')
export class DeliveryRoute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: RouteType, default: RouteType.NORMAL })
  routeType: RouteType;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'volunteerId' })
  volunteer: User;

  @Column({ nullable: true })
  volunteerId: number;

  @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.OPEN })
  status: RouteStatus;

  @Column({ type: 'text', nullable: true })
  note: string;

  @OneToMany(() => DeliveryTask, (t) => t.route)
  tasks: DeliveryTask[];

  @CreateDateColumn()
  createdAt: Date;
}
