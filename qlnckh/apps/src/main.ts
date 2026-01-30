/**
 * QLNCKH - Hệ thống Quản lý Nghiên cứu Khoa học
 * Backend API Server
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('QLNCKH API')
    .setDescription(`
## Hệ thống Quản lý Nghiên cứu Khoa học

API documentation cho hệ thống quản lý đề tài NCKH dành cho các trường đại học.

### Các tính năng chính:
- **Authentication**: Đăng nhập, đăng xuất, refresh token
- **Proposals**: Quản lý đề tài NCKH (CRUD + Workflow)
- **Workflow**: Quy trình xét duyệt đề tài (13 trạng thái)
- **Evaluations**: Đánh giá của hội đồng
- **Documents**: Tạo và quản lý văn bản
- **AI Chat**: Chatbot hỗ trợ và tự động điền form

### Các vai trò người dùng:
- GIANG_VIEN: Giảng viên - Chủ nhiệm đề tài
- QUAN_LY_KHOA: Quản lý khoa
- THU_KY_KHOA: Thư ký khoa
- PHONG_KHCN: Phòng Khoa học Công nghệ
- BAN_GIAM_HOC: Ban giám hiệu
- ADMIN: Quản trị hệ thống
    `)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth('access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token',
    })
    .addTag('Auth', 'Xác thực và phân quyền')
    .addTag('Users', 'Quản lý người dùng')
    .addTag('Proposals', 'Quản lý đề tài NCKH')
    .addTag('Workflow', 'Quy trình xét duyệt')
    .addTag('Evaluations', 'Đánh giá hội đồng')
    .addTag('Documents', 'Quản lý văn bản')
    .addTag('Councils', 'Quản lý hội đồng')
    .addTag('Faculties', 'Quản lý khoa/bộ môn')
    .addTag('Dashboard', 'Dashboard theo vai trò')
    .addTag('AI Chat', 'Chatbot AI hỗ trợ')
    .addTag('Attachments', 'File đính kèm')
    .addTag('Exports', 'Xuất dữ liệu')
    .addTag('Bulk Operations', 'Thao tác hàng loạt')
    .addTag('Demo', 'Chế độ demo')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'QLNCKH API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { font-size: 2em }
    `,
  });

  const port = process.env.PORT || 4000;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  await app.listen(port, host);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `📚 Swagger docs available at: http://localhost:${port}/docs`,
  );
}

bootstrap();
