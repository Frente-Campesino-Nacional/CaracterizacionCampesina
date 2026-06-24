"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MongoOptionalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoOptionalService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("mongoose");
let MongoOptionalService = MongoOptionalService_1 = class MongoOptionalService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(MongoOptionalService_1.name);
        this.connection = null;
        this.enabled = false;
    }
    async onModuleInit() {
        const optionalEnabled = this.configService.get('mongodb.optionalEnabled');
        if (!optionalEnabled) {
            this.logger.log('Mongo opcional deshabilitado (MONGODB_OPTIONAL_ENABLED=false).');
            return;
        }
        const uri = this.configService.get('mongodb.uri');
        if (!uri) {
            this.logger.warn('Mongo opcional habilitado pero MONGODB_URI no esta configurado.');
            return;
        }
        const dbName = this.configService.get('mongodb.dbName') || undefined;
        try {
            this.connection = await (0, mongoose_1.createConnection)(uri, {
                dbName,
                serverSelectionTimeoutMS: 3000,
                connectTimeoutMS: 3000,
            }).asPromise();
            this.enabled = true;
            this.logger.log('Mongo opcional conectado correctamente.');
        }
        catch (error) {
            this.enabled = false;
            this.connection = null;
            this.logger.warn(`Mongo opcional no disponible: ${error.message}`);
        }
    }
    async onModuleDestroy() {
        if (this.connection) {
            await this.connection.close();
        }
    }
    isEnabled() {
        return this.enabled && this.connection?.readyState === 1;
    }
    async saveFormularioRespuesta(input) {
        if (!this.isEnabled() || !this.connection) {
            return null;
        }
        const now = new Date();
        const result = await this.connection.collection('form_responses').insertOne({
            formulario_id: input.formularioId,
            campesino_id: input.campesinoId,
            encuestador_id: input.encuestadorId,
            respuestas: input.respuestas,
            metadata: input.metadata ?? {},
            capturado_en: input.capturadoEn ?? now,
            creado_en: now,
            actualizado_en: now,
        });
        return result.insertedId.toString();
    }
    async saveUsuarioPerfilImagen(input) {
        if (!this.isEnabled() || !this.connection) {
            return null;
        }
        const now = new Date();
        await this.connection.collection('usuario_perfil_imagenes').updateOne({ usuario_id: input.usuarioId }, {
            $set: {
                content_type: input.contentType,
                file_name: input.fileName,
                size_bytes: input.sizeBytes,
                image_base64: input.imageBase64,
                image_url: input.imageUrl,
                metadata: input.metadata ?? {},
                actualizado_en: now,
            },
            $setOnInsert: {
                usuario_id: input.usuarioId,
                creado_en: now,
            },
        }, {
            upsert: true,
        });
        const document = await this.connection.collection('usuario_perfil_imagenes').findOne({ usuario_id: input.usuarioId }, { sort: { actualizado_en: -1, creado_en: -1 } });
        return document?._id?.toString() || null;
    }
    async getUsuarioPerfilImagen(usuarioId) {
        if (!this.isEnabled() || !this.connection) {
            return null;
        }
        const document = await this.connection.collection('usuario_perfil_imagenes').findOne({ usuario_id: usuarioId }, { sort: { actualizado_en: -1, creado_en: -1 } });
        return document || null;
    }
    async deleteUsuarioPerfilImagen(usuarioId) {
        if (!this.isEnabled() || !this.connection) {
            return false;
        }
        const result = await this.connection.collection('usuario_perfil_imagenes').deleteOne({
            usuario_id: usuarioId,
        });
        return result.deletedCount > 0;
    }
    async saveCampesinoPerfilImagen(input) {
        if (!this.isEnabled() || !this.connection) {
            return null;
        }
        const now = new Date();
        await this.connection.collection('campesino_perfil_imagenes').updateOne({ campesino_id: input.campesinoId }, {
            $set: {
                content_type: input.contentType,
                file_name: input.fileName,
                size_bytes: input.sizeBytes,
                image_base64: input.imageBase64,
                image_url: input.imageUrl,
                metadata: input.metadata ?? {},
                actualizado_en: now,
            },
            $setOnInsert: {
                campesino_id: input.campesinoId,
                creado_en: now,
            },
        }, { upsert: true });
        const document = await this.connection.collection('campesino_perfil_imagenes').findOne({ campesino_id: input.campesinoId }, { sort: { actualizado_en: -1, creado_en: -1 } });
        return document?._id?.toString() || null;
    }
    async getCampesinoPerfilImagen(campesinoId) {
        if (!this.isEnabled() || !this.connection) {
            return null;
        }
        const document = await this.connection.collection('campesino_perfil_imagenes').findOne({ campesino_id: campesinoId }, { sort: { actualizado_en: -1, creado_en: -1 } });
        return document || null;
    }
    async deleteCampesinoPerfilImagen(campesinoId) {
        if (!this.isEnabled() || !this.connection) {
            return false;
        }
        const result = await this.connection.collection('campesino_perfil_imagenes').deleteOne({
            campesino_id: campesinoId,
        });
        return result.deletedCount > 0;
    }
};
exports.MongoOptionalService = MongoOptionalService;
exports.MongoOptionalService = MongoOptionalService = MongoOptionalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MongoOptionalService);
//# sourceMappingURL=mongo-optional.service.js.map