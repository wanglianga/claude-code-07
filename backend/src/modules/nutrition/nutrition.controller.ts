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
import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { NutritionService } from './nutrition.service';
import { Roles, CurrentUser } from '../../common/decorators';
import { UserRole, MealType } from '../../common/enums';

class CreateAdviceDto {
  @IsInt() elderId: number;
  @IsEnum(MealType) mealType: MealType;
  @IsNotEmpty() startDate: string;
  @IsOptional() endDate?: string;
  @IsOptional() note?: string;
}

class UpdateAdviceDto {
  @IsOptional() @IsEnum(MealType) mealType?: MealType;
  @IsOptional() startDate?: string;
  @IsOptional() endDate?: string;
  @IsOptional() note?: string;
  @IsOptional() active?: boolean;
}

@Controller('nutrition/advices')
export class NutritionController {
  constructor(private nutritionService: NutritionService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.NUTRITIONIST, UserRole.COMMUNITY_WORKER, UserRole.KITCHEN_STAFF)
  list(@Query('elderId') elderId?: string) {
    return this.nutritionService.list(elderId ? parseInt(elderId, 10) : undefined);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.NUTRITIONIST)
  create(@Body() dto: CreateAdviceDto, @CurrentUser() user: any) {
    return this.nutritionService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.NUTRITIONIST)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdviceDto) {
    return this.nutritionService.update(id, dto);
  }
}
