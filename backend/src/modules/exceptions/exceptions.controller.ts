import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ExceptionsService } from './exceptions.service';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole, ExceptionStatus, ElderStatus } from '../../common/enums';

class ResolveDto {
  @IsNotEmpty({ message: '请填写处理说明' }) resolution: string;
  @IsOptional() @IsEnum(['DELIVERED', 'RETURNED'])
  taskOutcome?: 'DELIVERED' | 'RETURNED';
  @IsOptional() @IsEnum(ElderStatus) newElderStatus?: ElderStatus;
}

@Controller('exceptions')
export class ExceptionsController {
  constructor(private exceptionsService: ExceptionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COMMUNITY_WORKER, UserRole.VOLUNTEER)
  list(@Query('status') status: ExceptionStatus, @CurrentUser() user: any) {
    return this.exceptionsService.list(status, user);
  }

  @Post(':id/claim')
  @Roles(UserRole.ADMIN, UserRole.COMMUNITY_WORKER)
  claim(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.exceptionsService.claim(id, user);
  }

  @Post(':id/resolve')
  @Roles(UserRole.ADMIN, UserRole.COMMUNITY_WORKER)
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveDto,
    @CurrentUser() user: any,
  ) {
    return this.exceptionsService.resolve(id, user, dto);
  }
}
