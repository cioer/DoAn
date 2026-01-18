/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://huuthang.online', 'http://huuthang.online']
      : ['http://localhost:4200', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  });

  // Enable cookie parsing
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const port = process.env.PORT || 4000;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  await app.listen(port, host);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
