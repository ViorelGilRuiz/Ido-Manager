import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS para permitir Netlify
  const allowedOrigins = [
    'http://localhost:4200',
    'https://ido-manager-app-front.netlify.app',
    'https://ido-manager-app-frontend.netlify.app',
  ];
  
  // Agregar origen adicional si viene de variable de entorno
  const envOrigin = process.env.CLIENT_URL;
  if (envOrigin) {
    const origins = envOrigin.split(',').map((url) => url.trim());
    allowedOrigins.push(...origins);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, prefix: 'v' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
