import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationError, ValidationPipe, HttpException, HttpStatus } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

function flattenValidationErrors(errors: ValidationError[], parentPath = ''): string[] {
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
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));


  app.useGlobalFilters({
    catch(exception: unknown, host: any) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const request = ctx.getRequest();

      const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const responseBody = exception instanceof HttpException ? exception.getResponse() : { message: 'Error interno del servidor' };

      if (status >= 400 && status < 500) {
        // eslint-disable-next-line no-console
        console.error('[http-error]', {
          status,
          path: request?.url,
          method: request?.method,
          responseBody,
        });
      }

      if (status >= 500) {
        // eslint-disable-next-line no-console
        console.error('[server-error]', {
          status,
          path: request?.url,
          method: request?.method,
          responseBody,
          error: exception instanceof Error ? exception.message : 'Unknown error',
          stack: exception instanceof Error ? exception.stack : undefined,
        });
      }

      response.status(status).json(responseBody);
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false, value: false },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = flattenValidationErrors(errors);
        // eslint-disable-next-line no-console
        console.error('Validation errors:', messages);
        return new BadRequestException({
          message: 'Error de validacion',
          errors: messages,
        });
      },
    }),
  );

  app.enableCors({
    origin: ['http://localhost:3008', 'http://localhost:8080'],
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: [''] });

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