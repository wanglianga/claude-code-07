import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  ElderStatus,
  ChewingAbility,
  SubsidyLevel,
} from '../common/enums';
import { User } from './user.entity';

@Entity('elders')
export class Elder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['MALE', 'FEMALE'] })
  gender: 'MALE' | 'FEMALE';

  @Column({ type: 'date', nullable: true })
  birthDate: string;

  @Column({ nullable: true })
  phone: string;

  /** 送餐地址 */
  @Column()
  address: string;

  /** 楼栋标识（如"3栋"，用于同楼栋转交匹配） */
  @Column({ nullable: true })
  building: string;

  /** 是否纳入备用名单（可接收住院老人转出的餐） */
  @Column({ default: false })
  backupEligible: boolean;

  /** 关联家属账号（家属可标记住院/出院） */
  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'familyUserId' })
  familyUser: User;

  @Column({ nullable: true })
  familyUserId: number;

  /** 慢病情况 */
  @Column({ type: 'simple-json', nullable: true })
  chronicDiseases: string[];

  /** 咀嚼能力 */
  @Column({ type: 'enum', enum: ChewingAbility, default: ChewingAbility.NORMAL })
  chewingAbility: ChewingAbility;

  /** 忌口 */
  @Column({ type: 'simple-json', nullable: true })
  dietaryRestrictions: string[];

  /** 过敏 */
  @Column({ type: 'simple-json', nullable: true })
  allergies: string[];

  /** 紧急联系人 */
  @Column({ nullable: true })
  emergencyContactName: string;

  @Column({ nullable: true })
  emergencyContactPhone: string;

  @Column({ nullable: true })
  emergencyContactRelation: string;

  /** 补贴资格 */
  @Column({ type: 'enum', enum: SubsidyLevel, default: SubsidyLevel.NONE })
  subsidyLevel: SubsidyLevel;

  /** 档案状态：正常/观察/暂停/住院/需上门探访 */
  @Column({ type: 'enum', enum: ElderStatus, default: ElderStatus.NORMAL })
  status: ElderStatus;

  @Column({ type: 'text', nullable: true })
  statusNote: string;

  /** 送餐注意事项（志愿者可见） */
  @Column({ type: 'text', nullable: true })
  deliveryNote: string;

  /** 连续无人签收次数（用于路线调整） */
  @Column({ default: 0 })
  consecutiveMissed: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'communityWorkerId' })
  communityWorker: User;

  @Column({ nullable: true })
  communityWorkerId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
