import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HospitalRecordStatus, MarkChannel } from '../common/enums';
import { Elder } from './elder.entity';
import { User } from './user.entity';

/** 住院记录：一次"住院 → 出院 → 恢复确认"的完整周期 */
@Entity('hospital_records')
export class HospitalRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Elder)
  @JoinColumn({ name: 'elderId' })
  elder: Elder;

  @Column()
  elderId: number;

  /** 标记者（家属或社区工作人员） */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'markedById' })
  markedBy: User;

  @Column()
  markedById: number;

  /** 标记渠道：家属 / 社区 */
  @Column({ type: 'enum', enum: MarkChannel })
  markChannel: MarkChannel;

  /** 住院说明（医院、病因等） */
  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({
    type: 'enum',
    enum: HospitalRecordStatus,
    default: HospitalRecordStatus.HOSPITALIZED,
  })
  status: HospitalRecordStatus;

  /** 出院时间 */
  @Column({ type: 'timestamp', nullable: true })
  dischargedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'dischargeById' })
  dischargeBy: User;

  @Column({ nullable: true })
  dischargeById: number;

  @Column({ type: 'text', nullable: true })
  dischargeNote: string;

  /** 恢复送餐确认（社区工作人员） */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resumedById' })
  resumedBy: User;

  @Column({ nullable: true })
  resumedById: number;

  @Column({ type: 'timestamp', nullable: true })
  resumedAt: Date;

  /** 恢复确认：饮食禁忌已重新核对 */
  @Column({ default: false })
  dietConfirmed: boolean;

  /** 恢复确认：送餐地址已重新核对 */
  @Column({ default: false })
  addressConfirmed: boolean;

  @Column({ type: 'text', nullable: true })
  resumeNote: string;

  @CreateDateColumn()
  createdAt: Date;
}
