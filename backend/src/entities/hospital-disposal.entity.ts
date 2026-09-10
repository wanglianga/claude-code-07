import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  DisposalStage,
  DisposalAction,
  DisposalStatus,
  MealType,
} from '../common/enums';
import { HospitalRecord } from './hospital-record.entity';
import { DeliveryTask } from './delivery-task.entity';
import { User } from './user.entity';

/**
 * 住院当日餐处置单：
 * 标记住院时按当天餐所处阶段（未备餐/已备餐/已出库）生成，
 * 记录处置结果及其对补贴核销、厨房损耗的影响。
 */
@Entity('hospital_disposals')
export class HospitalDisposal {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => HospitalRecord)
  @JoinColumn({ name: 'hospitalRecordId' })
  hospitalRecord: HospitalRecord;

  @Column()
  hospitalRecordId: number;

  @Column()
  elderId: number;

  @Column()
  elderName: string;

  /** 餐日期 */
  @Column({ type: 'date' })
  date: string;

  /** 关联配送任务（已派单/出库时） */
  @ManyToOne(() => DeliveryTask, { nullable: true })
  @JoinColumn({ name: 'taskId' })
  task: DeliveryTask;

  @Column({ nullable: true })
  taskId: number;

  @Column({ nullable: true })
  boxNumber: string;

  @Column({ nullable: true })
  dishName: string;

  @Column({ type: 'enum', enum: MealType, nullable: true })
  mealType: MealType;

  /** 发现住院时餐所处阶段 */
  @Column({ type: 'enum', enum: DisposalStage })
  stage: DisposalStage;

  /** 处置方式 */
  @Column({ type: 'enum', enum: DisposalAction })
  action: DisposalAction;

  @Column({ type: 'enum', enum: DisposalStatus, default: DisposalStatus.DONE })
  status: DisposalStatus;

  /** 转交/转备用接收人 */
  @Column({ nullable: true })
  transferToElderId: number;

  @Column({ nullable: true })
  transferToElderName: string;

  /** 是否计入厨房损耗 */
  @Column({ default: false })
  kitchenLoss: boolean;

  /** 对补贴核销的影响说明 */
  @Column({ type: 'text', nullable: true })
  subsidyNote: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  /** 处置人（志愿者，已出库处置时） */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'handledById' })
  handledBy: User;

  @Column({ nullable: true })
  handledById: number;

  @Column({ type: 'timestamp', nullable: true })
  handledAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
