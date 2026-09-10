import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { DisposalAction, MealType } from '../common/enums';

/** 厨房损耗台账：住院联动产生的退回/报损/备餐后无人接收 */
@Entity('kitchen_losses')
export class KitchenLoss {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  /** 关联处置单 */
  @Column()
  disposalId: number;

  @Column()
  elderId: number;

  @Column()
  elderName: string;

  @Column({ nullable: true })
  boxNumber: string;

  @Column({ nullable: true })
  dishName: string;

  @Column({ type: 'enum', enum: MealType, nullable: true })
  mealType: MealType;

  /** 损耗来源动作 */
  @Column({ type: 'enum', enum: DisposalAction })
  action: DisposalAction;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
