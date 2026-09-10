import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EldersModule } from './modules/elders/elders.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { DishesModule } from './modules/dishes/dishes.module';
import { KitchenModule } from './modules/kitchen/kitchen.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { ExceptionsModule } from './modules/exceptions/exceptions.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { StatsModule } from './modules/stats/stats.module';
import { HospitalModule } from './modules/hospital/hospital.module';
import { SeedModule } from './seed/seed.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'meal_platform',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    EldersModule,
    NutritionModule,
    DishesModule,
    KitchenModule,
    DeliveryModule,
    ExceptionsModule,
    SettlementsModule,
    StatsModule,
    HospitalModule,
    SeedModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
