import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MealType } from '../common/enums';
import { Elder } from './elder.entity';
import { User } from './user.entity';

/** 营养师用餐建议 */
@Entity('nutrition_advices')
export class NutritionAdvice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Elder)
  @JoinColumn({ name: 'elderId' })
  elder: Elder;

  @Column()
  elderId: number;

  /** 普通餐 / 软烂餐 / 低盐低糖餐 / 临时停餐 */
  @Column({ type: 'enum', enum: MealType })
  mealType: MealType;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'nutritionistId' })
  nutritionist: User;

  @Column()
  nutritionistId: number;

  @CreateDateColumn()
  createdAt: Date;
}
