import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  TaskStatus,
  SignMethod,
  ElderCondition,
  MealType,
} from '../common/enums';
import { DeliveryRoute } from './delivery-route.entity';
import { Elder } from './elder.entity';

@Entity('delivery_tasks')
export class DeliveryTask {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DeliveryRoute, (r) => r.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routeId' })
  route: DeliveryRoute;

  @Column()
  routeId: number;

  @ManyToOne(() => Elder)
  @JoinColumn({ name: 'elderId' })
  elder: Elder;

  @Column()
  elderId: number;

  /** 快照：老人姓名 */
  @Column()
  elderName: string;

  /** 快照：送餐地址 */
  @Column()
  address: string;

  @Column({ type: 'enum', enum: MealType })
  mealType: MealType;

  /** 快照：菜品名称 */
  @Column()
  dishName: string;

  /** 餐盒编号 */
  @Column()
  boxNumber: string;

  /** 签收方式 */
  @Column({ type: 'enum', enum: SignMethod, default: SignMethod.SELF })
  signMethod: SignMethod;

  /** 注意事项（志愿者可见） */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /** 路线内顺序 */
  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  /** 送达时餐品温度（℃） */
  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature: number;

  @Column({ nullable: true })
  signerName: string;

  @Column({ nullable: true })
  signerRelation: string;

  /** 送达时老人状态 */
  @Column({ type: 'enum', enum: ElderCondition, nullable: true })
  elderCondition: ElderCondition;

  /** 是否有剩餐反馈 */
  @Column({ default: false })
  hasLeftover: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
