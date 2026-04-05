import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { Environment } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('BACKEND_PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // --- Response compression (app-level; Nginx handles this in production) ---
  app.use(compression());

  // --- Security: Helmet HTTP headers ---
  app.use(
    helmet({
      // Swagger UI relies on inline assets that strict CSP blocks.
      // Keep a strict CSP in production API mode and relaxed in dev/local.
      contentSecurityPolicy:
        nodeEnv === Environment.PRODUCTION
          ? {
              directives: {
                defaultSrc: ["'none'"],
                connectSrc: ["'self'"],
                imgSrc: ["'self'"],
                styleSrc: ["'self'"],
                scriptSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'none'"],
                frameAncestors: ["'none'"],
                formAction: ["'self'"],
              },
            }
          : false,
      xPoweredBy: false,
    }),
  );

  // --- CORS ---
  const corsOriginsRaw = configService.get<string>('CORS_ORIGINS', '');
  const corsOrigins = corsOriginsRaw
    ? corsOriginsRaw.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3002'];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'Accept',
    ],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 86400,
  });

  // --- Global API prefix ---
  app.setGlobalPrefix('api/v1');

  // --- Global validation pipe ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // --- Global exception filter ---
  app.useGlobalFilters(new GlobalExceptionFilter());

  // --- Swagger API documentation (non-production only) ---
  if (nodeEnv !== Environment.PRODUCTION) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Ethiopian Exam Prep API')
      .setDescription(
        'API for the Ethiopian National Exam preparation platform. ' +
          'Covers question practice, mock exams, progress tracking, ' +
          'leaderboards, and subscription management.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    Logger.log(
      `Swagger docs available at http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
  }

  // --- Graceful shutdown ---
  app.enableShutdownHooks();

  await app.listen(port);

  Logger.log(
    `Application running on http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
  Logger.log(`Environment: ${nodeEnv}`, 'Bootstrap');
  Logger.log(`CORS origins: ${corsOrigins.join(', ')}`, 'Bootstrap');
}

bootstrap();
