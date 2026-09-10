import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { HospitalService } from './hospital.service';
import { Roles, CurrentUser } from '../../common/decorators';
import {
  UserRole,
  HospitalRecordStatus,
  DisposalStatus,
  DisposalAction,
} from '../../common/enums';

class AdmitDto {
  @IsInt() elderId: number;
  @IsOptional() @IsString() reason?: string;
}

class DischargeDto {
  @IsOptional() @IsString() note?: string;
}

class ResumeDto {
  @IsBoolean({ message: '请确认已重新核对饮食禁忌' })
  dietConfirmed: boolean;
  @IsBoolean({ message: '请确认已重新核对送餐地址' })
  addressConfirmed: boolean;
  @IsOptional() @IsArray() dietaryRestrictions?: string[];
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() note?: string;
}

class HandleDisposalDto {
  @IsEnum(DisposalAction) action: DisposalAction;
  @IsOptional() @IsInt() transferToElderId?: number;
  @IsOptional() @IsString() note?: string;
}

const STAFF_ROLES = [UserRole.ADMIN, UserRole.COMMUNITY_WORKER];

@Controller('hospital')
export class HospitalController {
  constructor(private hospitalService: HospitalService) {}

  /** 家属：我家老人（含当前住院状态） */
  @Get('my-elders')
  @Roles(UserRole.FAMILY)
  myElders(@CurrentUser() user: any) {
    return this.hospitalService.myElders(user);
  }

  /** 住院记录列表 */
  @Get('records')
  @Roles(...STAFF_ROLES, UserRole.KITCHEN_STAFF, UserRole.FAMILY)
  listRecords(
    @Query('status') status: HospitalRecordStatus | undefined,
    @CurrentUser() user: any,
  ) {
    return this.hospitalService.listRecords(status, user);
  }

  @Get('records/:id')
  @Roles(...STAFF_ROLES, UserRole.KITCHEN_STAFF, UserRole.FAMILY)
  recordDetail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.hospitalService.recordDetail(id, user);
  }

  /** 标记住院（家属/社区/管理员）→ 触发停餐联动 */
  @Post('admit')
  @Roles(...STAFF_ROLES, UserRole.FAMILY)
  admit(@Body() dto: AdmitDto, @CurrentUser() user: any) {
    return this.hospitalService.admit(dto.elderId, user, dto.reason);
  }

  /** 标记出院（家属/社区/管理员）→ 出院待确认 */
  @Post('records/:id/discharge')
  @Roles(...STAFF_ROLES, UserRole.FAMILY)
  discharge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DischargeDto,
    @CurrentUser() user: any,
  ) {
    return this.hospitalService.discharge(id, user, dto.note);
  }

  /** 恢复确认（社区/管理员）：重新确认饮食禁忌+送餐地址 → 恢复排餐 */
  @Post('records/:id/resume')
  @Roles(...STAFF_ROLES)
  resume(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResumeDto,
    @CurrentUser() user: any,
  ) {
    return this.hospitalService.resume(id, user, dto);
  }

  /** 处置单列表 */
  @Get('disposals')
  @Roles(...STAFF_ROLES, UserRole.KITCHEN_STAFF, UserRole.VOLUNTEER)
  listDisposals(
    @Query('status') status: DisposalStatus | undefined,
    @CurrentUser() user: any,
  ) {
    return this.hospitalService.listDisposals(status, user);
  }

  /** 同楼栋可转交老人 */
  @Get('disposals/:id/candidates')
  @Roles(...STAFF_ROLES, UserRole.VOLUNTEER)
  transferCandidates(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.hospitalService.transferCandidates(id, user);
  }

  /** 志愿者处置已出库餐盒 */
  @Post('disposals/:id/handle')
  @Roles(UserRole.VOLUNTEER)
  handleDisposal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HandleDisposalDto,
    @CurrentUser() user: any,
  ) {
    return this.hospitalService.handleDisposal(id, user, dto);
  }

  /** 备用名单 */
  @Get('backup-list')
  @Roles(...STAFF_ROLES, UserRole.KITCHEN_STAFF)
  backupList() {
    return this.hospitalService.backupList();
  }

  /** 厨房损耗台账 */
  @Get('losses')
  @Roles(...STAFF_ROLES, UserRole.KITCHEN_STAFF)
  listLosses() {
    return this.hospitalService.listLosses();
  }
}
