"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuariosService = void 0;
const common_1 = require("@nestjs/common");
const mongo_optional_service_1 = require("../../database/mongo-optional.service");
const prisma_service_1 = require("../../database/prisma.service");
const cedula_code_util_1 = require("../../common/utils/cedula-code.util");
const bcrypt = __importStar(require("bcryptjs"));
let UsuariosService = class UsuariosService {
    constructor(prisma, mongoOptionalService) {
        this.prisma = prisma;
        this.mongoOptionalService = mongoOptionalService;
    }
    normalizeCatalogValue(value) {
        const normalized = value?.trim();
        return normalized ? normalized : undefined;
    }
    normalizeRoleValue(value) {
        const normalized = this.normalizeCatalogValue(value)?.toLowerCase();
        if (!normalized || normalized === 'admin' || normalized === 'administrador') {
            return 'administrador';
        }
        return normalized;
    }
    mapUsuario(usuario) {
        const { rol, genero, consejo, ...rest } = usuario;
        return {
            ...rest,
            rol: rol.tipo_rol,
            genero: genero?.tipo_gen || null,
            consejo_nombre: consejo?.nombre || null,
        };
    }
    normalizeDateInput(value) {
        if (!value) {
            return undefined;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return new Date(`${value}T00:00:00.000Z`);
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    async findAll(requester) {
        if (this.normalizeRoleValue(requester.rol) !== 'administrador') {
            throw new common_1.ForbiddenException('Solo administradores pueden listar usuarios');
        }
        const usuarios = await this.prisma.usuario.findMany({
            include: {
                rol: true,
                genero: true,
            },
        });
        return usuarios.map((usuario) => this.mapUsuario(usuario));
    }
    async findOne(id, requester) {
        if (this.normalizeRoleValue(requester.rol) !== 'administrador') {
            throw new common_1.ForbiddenException('Solo administradores pueden ver perfiles de usuarios');
        }
        const usuario = await this.prisma.usuario.findUnique({
            where: { id },
            include: {
                rol: true,
                genero: true,
            },
        });
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.mapUsuario(usuario);
    }
    async create(createUsuarioDto) {
        const existingUser = await this.prisma.usuario.findUnique({
            where: { email: createUsuarioDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('El email ya está registrado');
        }
        const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);
        let cedula = createUsuarioDto.cedula ? (0, cedula_code_util_1.normalizeCedulaInput)(createUsuarioDto.cedula) : '';
        if (!cedula) {
            cedula = await this.generateUniqueCedula();
        }
        else {
            if (!(0, cedula_code_util_1.isValidCedulaCode)(cedula)) {
                throw new common_1.BadRequestException('La cédula debe ser V-12345678, E-12345678 o un número de 9 dígitos');
            }
            const existingCédula = await this.prisma.usuario.findUnique({ where: { cedula } });
            if (existingCédula) {
                throw new common_1.ConflictException('La cédula ya está registrada');
            }
        }
        const rolValue = this.normalizeRoleValue(createUsuarioDto.rol || 'encuestador');
        const generoValue = this.normalizeCatalogValue(createUsuarioDto.genero);
        const usuario = await this.prisma.usuario.create({
            data: {
                email: createUsuarioDto.email,
                password_hash: hashedPassword,
                cedula,
                nombre: createUsuarioDto.nombre,
                apellido: createUsuarioDto.apellido,
                rol: {
                    connectOrCreate: {
                        where: { tipo_rol: rolValue },
                        create: { tipo_rol: rolValue },
                    },
                },
                numero_telefono: createUsuarioDto.numero_telefono,
                fecha_nacimiento: this.normalizeDateInput(createUsuarioDto.fecha_nacimiento),
                genero: generoValue
                    ? {
                        connectOrCreate: {
                            where: { tipo_gen: generoValue },
                            create: { tipo_gen: generoValue },
                        },
                    }
                    : undefined,
                estado: createUsuarioDto.estado,
                municipio: createUsuarioDto.municipio,
                direccion: createUsuarioDto.direccion,
                consejo: createUsuarioDto.consejo_id
                    ? {
                        connect: { id: Number(createUsuarioDto.consejo_id) },
                    }
                    : undefined,
                activo: createUsuarioDto.activo ?? true,
                creado_en: createUsuarioDto.creado_en ? new Date(createUsuarioDto.creado_en) : undefined,
            },
            include: {
                rol: true,
                genero: true,
                consejo: true,
            },
        });
        return this.mapUsuario(usuario);
    }
    async update(id, updateUsuarioDto) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id },
        });
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        if (updateUsuarioDto.email && updateUsuarioDto.email !== usuario.email) {
            const existingUser = await this.prisma.usuario.findUnique({
                where: { email: updateUsuarioDto.email },
            });
            if (existingUser) {
                throw new common_1.ConflictException('El email ya está registrado');
            }
        }
        const data = { ...updateUsuarioDto };
        if (data.password) {
            data.password_hash = await bcrypt.hash(data.password, 10);
            delete data.password;
        }
        delete data.creado_en;
        delete data.actualizado_en;
        if (typeof data.fecha_nacimiento === 'string') {
            data.fecha_nacimiento = this.normalizeDateInput(data.fecha_nacimiento);
        }
        if ('cedula' in data) {
            const cedulaValue = data.cedula ? (0, cedula_code_util_1.normalizeCedulaInput)(data.cedula) : '';
            if (!cedulaValue) {
                throw new common_1.BadRequestException('La cédula no puede estar vacía');
            }
            if (!(0, cedula_code_util_1.isValidCedulaCode)(cedulaValue)) {
                throw new common_1.BadRequestException('La cédula debe ser V-12345678, E-12345678 o un número de 9 dígitos');
            }
            const existingCédula = await this.prisma.usuario.findUnique({ where: { cedula: cedulaValue } });
            if (existingCédula && existingCédula.id !== id) {
                throw new common_1.ConflictException('La cédula ya está registrada');
            }
            data.cedula = cedulaValue;
        }
        if ('rol' in data) {
            const rolValue = this.normalizeRoleValue(data.rol);
            if (rolValue) {
                data.rol = {
                    connectOrCreate: {
                        where: { tipo_rol: rolValue },
                        create: { tipo_rol: rolValue },
                    },
                };
            }
            else {
                delete data.rol;
            }
        }
        if ('consejo_id' in data) {
            const consejoId = data.consejo_id;
            if (consejoId === null || consejoId === undefined || consejoId === '') {
                data.consejo = { disconnect: true };
            }
            else {
                data.consejo = {
                    connect: { id: Number(consejoId) },
                };
            }
            delete data.consejo_id;
        }
        if ('genero' in data) {
            const generoValue = this.normalizeCatalogValue(data.genero);
            if (generoValue) {
                data.genero = {
                    connectOrCreate: {
                        where: { tipo_gen: generoValue },
                        create: { tipo_gen: generoValue },
                    },
                };
            }
            else {
                data.genero = { disconnect: true };
            }
        }
        const updated = await this.prisma.usuario.update({
            where: { id },
            data,
            include: {
                rol: true,
                genero: true,
                consejo: true,
            },
        });
        return this.mapUsuario(updated);
    }
    async generateUniqueCedula() {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const candidate = (0, cedula_code_util_1.generateRandomCedulaCode)();
            const existing = await this.prisma.usuario.findUnique({ where: { cedula: candidate } });
            if (!existing) {
                return candidate;
            }
        }
        throw new common_1.ConflictException('No se pudo generar un código de cédula único, intente nuevamente');
    }
    async remove(id) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id },
        });
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.prisma.usuario.delete({
            where: { id },
        });
    }
    async saveProfileImage(id, dto) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const mongoId = await this.mongoOptionalService.saveUsuarioPerfilImagen({
            usuarioId: id,
            contentType: dto.content_type,
            fileName: dto.file_name,
            sizeBytes: dto.size_bytes,
            imageBase64: dto.image_base64,
            imageUrl: dto.image_url,
            metadata: dto.metadata,
        });
        return {
            usuario_id: id,
            mongo_habilitado: this.mongoOptionalService.isEnabled(),
            guardado_en_mongo: Boolean(mongoId),
            mongo_id: mongoId,
        };
    }
    async getProfileImage(id) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const image = await this.mongoOptionalService.getUsuarioPerfilImagen(id);
        return {
            usuario_id: id,
            mongo_habilitado: this.mongoOptionalService.isEnabled(),
            imagen: image,
        };
    }
    async deleteProfileImage(id) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const deleted = await this.mongoOptionalService.deleteUsuarioPerfilImagen(id);
        return {
            usuario_id: id,
            mongo_habilitado: this.mongoOptionalService.isEnabled(),
            eliminado: deleted,
        };
    }
};
exports.UsuariosService = UsuariosService;
exports.UsuariosService = UsuariosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mongo_optional_service_1.MongoOptionalService])
], UsuariosService);
//# sourceMappingURL=usuarios.service.js.map