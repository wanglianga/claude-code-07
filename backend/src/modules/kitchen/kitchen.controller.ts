import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { KitchenService } from './kitchen.service';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole, MealType } from '../../common/enums';

class ScheduleDto {
  @IsNotEmpty() date: string;
  @IsEnum(MealType) mealType: MealType;
  @IsInt() dishId: number;
  @IsInt() @Min(1) plannedPortions: number;
  @IsOptional() packingTime?: string;
  @IsOptional() insulationRequirement?: string;
  @IsOptional() note?: string;
}

class UpdateScheduleDto {
  @IsOptional() @IsInt() dishId?: number;
  @IsOptional() @IsInt() @Min(1) plannedPortions?: number;
  @IsOptional() packingTime?: string;
  @IsOptional() insulationRequirement?: string;
  @IsOptional() note?: string;
}

class DateDto {
  @IsNotEmpty() date: string;
}

@Controller('kitchen')
@Roles(UserRole.ADMIN, UserRole.KITCHEN_STAFF)
export class KitchenController {
  constructor(private kitchenService: KitchenService) {}

  @Get('eligible')
  eligible(@Query('date') date: string) {
    return this.kitchenService.eligibleElders(date);
  }

  @Get('schedules')
  listSchedules(@Query('date') date: string) {
    return this.kitchenService.listSchedules(date);
  }

  @Post('schedules/generate')
  generate(@Body() dto: DateDto, @CurrentUser() user: any) {
    return this.kitchenService.generate(dto.date, user.id);
  }

  @Post('schedules')
  createSchedule(@Body() dto: ScheduleDto, @CurrentUser() user: any) {
    return this.kitchenService.createSchedule(dto, user.id);
  }

  @Patch('schedules/:id')
  updateSchedule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScheduleDto) {
    return this.kitchenService.updateSchedule(id, dto);
  }

  @Post('schedules/:id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number) {
    return this.kitchenService.confirmSchedule(id);
  }

  @Delete('schedules/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.kitchenService.removeSchedule(id);
  }

  @Post('dispatch')
  dispatch(@Body() dto: DateDto) {
    return this.kitchenService.dispatch(dto.date);
  }

  @Get('feedback')
  feedback(@Query('from') from: string, @Query('to') to: string) {
    return this.kitchenService.feedback(from, to);
  }
}
