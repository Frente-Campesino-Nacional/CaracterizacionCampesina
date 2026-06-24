"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const flattenValidationErrors = (errors, parentPath = '') => {
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
    };
    app.enableCors({
        origin: ['http://localhost:3008', 'http://localhost:8080'],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
            const messages = flattenValidationErrors(errors);
            return new common_1.BadRequestException({
                message: 'Error de validacion',
                errors: messages,
            });
        },
    }));
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