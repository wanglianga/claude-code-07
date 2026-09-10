import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { SettlementStatus } from '../common/enums';
import { Elder } from './elder.entity';

@Entity('subsidy_settlements')
@Unique(['elderId', 'period'])
export class SubsidySettlement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Elder)
  @JoinColumn({ name: 'elderId' })
  elder: Elder;

  @Column()
  elderId: number;

  /** 结算周期 YYYY-MM */
  @Column()
  period: string;

  /** 实际送达餐数 */
  @Column({ type: 'int', default: 0 })
  deliveredCount: number;

  /** 异常退餐数 */
  @Column({ type: 'int', default: 0 })
  exceptionCount: number;

  /** 代收确认数 */
  @Column({ type: 'int', default: 0 })
  proxyCount: number;

  /** 补贴单价（元/餐） */
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  unitSubsidy: number;

  /** 结算金额（元） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.PENDING })
  status: SettlementStatus;

  @CreateDateColumn()
  createdAt: Date;
}
