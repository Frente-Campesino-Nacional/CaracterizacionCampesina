import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const flattenValidationErrors = (errors: ValidationError[], parentPath = ''): string[] => {
    const messages: string[] = [];

    for (const error of errors) {
      const currentPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        for (const constraintMessage of Object.values(error.constraints)) {
          messages.push(`${currentPath}: ${constraintMessage}`);
        }
      }

      if (error.children?.length) {
        messages.push(...flattenValidationErrors(error.children, currentPath));
      }
    }

    return messages;
  };

  // Habilitar CORS
  app.enableCors({
    origin: ['http://localhost:3008', 'http://localhost:8080'],
    credentials: true,
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = flattenValidationErrors(errors);
        return new BadRequestException({
          message: 'Error de validacion',
          errors: messages,
        });
      },
    }),
  );

  // Prefijo global para la API
  app.setGlobalPrefix('api', { exclude: [''] });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('CensoCampesino API')
    .setDescription('API para el sistema de censo campesino')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const preferredPort = Number(process.env.PORT || 3008);
  await app.listen(preferredPort, '0.0.0.0');
  console.log(`🚀 Aplicación corriendo en: http://localhost:${preferredPort}`);
  console.log(`📚 Documentación Swagger: http://localhost:${preferredPort}/api/docs`);
}

bootstrap();