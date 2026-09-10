import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MealType, ScheduleStatus } from '../common/enums';
import { Dish } from './dish.entity';
import { User } from './user.entity';

/** 厨房排餐计划 */
@Entity('meal_schedules')
export class MealSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: MealType })
  mealType: MealType;

  @ManyToOne(() => Dish, { eager: true })
  @JoinColumn({ name: 'dishId' })
  dish: Dish;

  @Column()
  dishId: number;

  /** 计划份数 */
  @Column({ type: 'int' })
  plannedPortions: number;

  /** 打包时间，如 10:30 */
  @Column({ nullable: true })
  packingTime: string;

  /** 保温要求 */
  @Column({ nullable: true })
  insulationRequirement: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'enum', enum: ScheduleStatus, default: ScheduleStatus.DRAFT })
  status: ScheduleStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;
}
