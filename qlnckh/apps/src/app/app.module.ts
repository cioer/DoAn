import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { AuditModule } from '../modules/audit/audit.module';
import { DemoModule } from '../modules/demo/demo.module';
import { BusinessCalendarModule } from '../modules/calendar/calendar.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    AuditModule,
    DemoModule,
    BusinessCalendarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
