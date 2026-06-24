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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const prisma_service_1 = require("../../database/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
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
        return {
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre,
            rol: usuario.rol.tipo_rol,
            activo: usuario.activo,
            creado_en: usuario.creado_en,
        };
    }
    async login(loginDto) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { email: loginDto.email },
            include: {
                rol: true,
            },
        });
        if (!usuario) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, usuario.password_hash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        if (!usuario.activo) {
            throw new common_1.UnauthorizedException('Usuario inactivo');
        }
        const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol.tipo_rol };
        const token = this.jwtService.sign(payload);
        return {
            access_token: token,
            user: this.mapUsuario(usuario),
        };
    }
    async register(registerDto) {
        const existingUser = await this.prisma.usuario.findUnique({
            where: { email: registerDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('El email ya está registrado');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const usuario = await this.prisma.usuario.create({
            data: {
                email: registerDto.email,
                password_hash: hashedPassword,
                nombre: registerDto.nombre,
                apellido: registerDto.apellido || '',
                rol: {
                    connectOrCreate: {
                        where: { tipo_rol: this.normalizeRoleValue(registerDto.rol || 'encuestador') },
                        create: { tipo_rol: this.normalizeRoleValue(registerDto.rol || 'encuestador') },
                    },
                },
            },
            include: {
                rol: true,
            },
        });
        const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol.tipo_rol };
        const token = this.jwtService.sign(payload);
        return {
            access_token: token,
            user: this.mapUsuario(usuario),
        };
    }
    async getProfile(userId) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                nombre: true,
                rol: {
                    select: { tipo_rol: true },
                },
                activo: true,
                creado_en: true,
            },
        });
        if (!usuario) {
            throw new common_1.UnauthorizedException('Usuario no encontrado');
        }
        return this.mapUsuario(usuario);
    }
    async validateUser(email, password) {
        const usuario = await this.prisma.usuario.findUnique({
            where: { email },
            include: {
                rol: true,
            },
        });
        if (!usuario) {
            return null;
        }
        const isPasswordValid = await bcrypt.compare(password, usuario.password_hash);
        if (!isPasswordValid || !usuario.activo) {
            return null;
        }
        return { id: usuario.id, email: usuario.email, rol: usuario.rol.tipo_rol };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map