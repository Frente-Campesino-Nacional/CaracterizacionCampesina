"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const express_1 = require("express");
const app_module_1 = require("./app.module");
function flattenValidationErrors(errors, parentPath = '') {
    const messages = [];
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
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, express_1.json)({ limit: '50mb' }));
    app.use((0, express_1.urlencoded)({ limit: '50mb', extended: true }));
    app.useGlobalFilters({
        catch(exception, host) {
            const ctx = host.switchToHttp();
            const response = ctx.getResponse();
            const request = ctx.getRequest();
            const status = exception instanceof common_1.HttpException ? exception.getStatus() : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            const responseBody = exception instanceof common_1.HttpException ? exception.getResponse() : { message: 'Error interno del servidor' };
            if (status >= 400 && status < 500) {
                console.error('[http-error]', {
                    status,
                    path: request?.url,
                    method: request?.method,
                    responseBody,
                });
            }
            if (status >= 500) {
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
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        validationError: { target: false, value: false },
        exceptionFactory: (errors) => {
            const messages = flattenValidationErrors(errors);
            console.error('Validation errors:', messages);
            return new common_1.BadRequestException({
                message: 'Error de validacion',
                errors: messages,
            });
        },
    }));
    app.enableCors({
        origin: ['http://localhost:3008', 'http://localhost:8080'],
        credentials: true,
    });
    app.setGlobalPrefix('api', { exclude: [''] });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('CensoCampesino API')
        .setDescription('API para el sistema de censo campesino')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const preferredPort = Number(process.env.PORT || 3008);
    await app.listen(preferredPort, '0.0.0.0');
    console.log(`🚀 Aplicación corriendo en: http://localhost:${preferredPort}`);
    console.log(`📚 Documentación Swagger: http://localhost:${preferredPort}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map