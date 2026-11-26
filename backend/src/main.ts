import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { loadEnv } from './config/env.config';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: env.corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('StitchFlow Production Intelligence API')
    .setDescription('Multi-factory garment production monitoring & rework-aware bottleneck optimization API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, doc);

  await app.listen(env.port, '0.0.0.0');
  Logger.log(`StitchFlow Backend running on http://localhost:${env.port}/api/v1`, 'Bootstrap');
}

bootstrap();
