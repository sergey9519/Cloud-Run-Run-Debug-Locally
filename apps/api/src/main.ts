
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule);
    const httpAdapter = app.get(HttpAdapterHost);

    // Global Config
    app.setGlobalPrefix('api');
    
    // Security: Strict CORS Policy with Dev Flexibility
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const allowedOrigins = [
      frontendUrl,
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      'http://localhost:5176'
    ];

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests) or matching allowed list
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`Blocked CORS request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    // Increase body limit for file uploads and large JSON payloads
    app.use(json({ limit: '100mb' }));

    // Security: Strict Input Validation
    app.useGlobalPipes(new ValidationPipe({ 
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true, // Reject requests with unknown properties
      transformOptions: {
        enableImplicitConversion: true,
      },
    }));

    // Global Error Handling & Logging
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

    const port = process.env.PORT || 3001;
    await app.listen(port);
    logger.log(`🚀 Studio Roster API running on port ${port}`);
    logger.log(`🛡️  CORS allowed for: ${allowedOrigins.join(', ')}`);
  } catch (error) {
    logger.error(`Failed to start application: ${error.message}`, error.stack);
    (process as any).exit(1);
  }
}
bootstrap();
