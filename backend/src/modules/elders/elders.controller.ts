import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { EldersService } from './elders.service';
import { Roles, CurrentUser } from '../../common/decorators';
import {
  UserRole,
  ElderStatus,
  ChewingAbility,
  SubsidyLevel,
} from '../../common/enums';

class ElderDto {
  @IsNotEmpty({ message: '姓名必填' }) name: string;
  @IsEnum(['MALE', 'FEMALE']) gender: 'MALE' | 'FEMALE';
  @IsOptional() birthDate?: string;
  @IsOptional() phone?: string;
  @IsNotEmpty({ message: '送餐地址必填' }) address: string;
  @IsOptional() @IsString() building?: string;
  @IsOptional() @IsBoolean() backupEligible?: boolean;
  @IsOptional() @IsInt() familyUserId?: number;
  @IsOptional() @IsArray() chronicDiseases?: string[];
  @IsOptional() @IsEnum(ChewingAbility) chewingAbility?: ChewingAbility;
  @IsOptional() @IsArray() dietaryRestrictions?: string[];
  @IsOptional() @IsArray() allergies?: string[];
  @IsOptional() emergencyContactName?: string;
  @IsOptional() emergencyContactPhone?: string;
  @IsOptional() emergencyContactRelation?: string;
  @IsOptional() @IsEnum(SubsidyLevel) subsidyLevel?: SubsidyLevel;
  @IsOptional() @IsString() deliveryNote?: string;
}

class ChangeStatusDto {
  @IsEnum(ElderStatus) status: ElderStatus;
  @IsOptional() @IsString() reason?: string;
}

@Controller('elders')
export class EldersController {
  constructor(private eldersService: EldersService) {}

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.COMMUNITY_WORKER,
    UserRole.NUTRITIONIST,
    UserRole.KITCHEN_STAFF,
  )
  findAll(
    @Query('status') status?: ElderStatus,
    @Query('keyword') keyword?: string,
  ) {
    return this.eldersService.findAll({ status, keyword });
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COMMUNITY_WORKER,
    UserRole.NUTRITIONIST,
    UserRole.KITCHEN_STAFF,
  )
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eldersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COMMUNITY_WORKER)
  create(@Body() dto: ElderDto, @CurrentUser() user: any) {
    return this.eldersService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COMMUNITY_WORKER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: ElderDto) {
    return this.eldersService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.COMMUNITY_WORKER)
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.eldersService.changeStatus(id, dto.status, dto.reason, user);
  }
}
