import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express'; // ✅ Add this import

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.use(cookieParser());

  // ✅ Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), 'uploads', 'audio');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Created uploads directory: ${uploadsDir}`);
  }

  // ✅ CORRECT WAY: Use express.static with app.use()
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: config.get<string[]>('CORS_ORIGIN') ?? [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'Accept',
      'X-Requested-With',
    ],
  });

  const port = config.get<number>('PORT') ?? 3000;

  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${port}/chat`);
  console.log(`📁 Static files served from: /uploads/`);
}

bootstrap();
