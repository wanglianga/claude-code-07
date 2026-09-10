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
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { DeliveryService } from './delivery.service';
import { Roles, CurrentUser } from '../../common/decorators';
import {
  UserRole,
  SignMethod,
  ElderCondition,
  ExceptionType,
} from '../../common/enums';

class DeliverDto {
  @IsNumber() temperature: number;
  @IsEnum(SignMethod) signMethod: SignMethod;
  @IsNotEmpty({ message: '请填写签收人' }) signerName: string;
  @IsOptional() @IsString() signerRelation?: string;
  @IsEnum(ElderCondition) elderCondition: ElderCondition;
  @IsOptional() hasLeftover?: boolean;
}

class ExceptionDto {
  @IsEnum(ExceptionType) type: ExceptionType;
  @IsOptional() @IsString() description?: string;
}

@Controller('delivery')
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('routes')
  @Roles(
    UserRole.ADMIN,
    UserRole.COMMUNITY_WORKER,
    UserRole.KITCHEN_STAFF,
    UserRole.VOLUNTEER,
  )
  listRoutes(@Query('date') date: string, @CurrentUser() user: any) {
    return this.deliveryService.listRoutes(date, user);
  }

  @Get('routes/:id')
  @Roles(
    UserRole.ADMIN,
    UserRole.COMMUNITY_WORKER,
    UserRole.KITCHEN_STAFF,
    UserRole.VOLUNTEER,
  )
  routeDetail(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.deliveryService.routeDetail(id, user);
  }

  @Post('routes/:id/accept')
  @Roles(UserRole.VOLUNTEER)
  acceptRoute(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.deliveryService.acceptRoute(id, user);
  }

  @Post('routes/:id/start')
  @Roles(UserRole.VOLUNTEER)
  startRoute(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.deliveryService.startRoute(id, user);
  }

  @Post('tasks/:id/deliver')
  @Roles(UserRole.VOLUNTEER)
  deliver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeliverDto,
    @CurrentUser() user: any,
  ) {
    return this.deliveryService.deliver(id, user, dto);
  }

  @Post('tasks/:id/exception')
  @Roles(UserRole.VOLUNTEER)
  reportException(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExceptionDto,
    @CurrentUser() user: any,
  ) {
    return this.deliveryService.reportException(id, user, dto);
  }
}
