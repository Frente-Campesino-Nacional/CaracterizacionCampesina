import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    private normalizeCatalogValue;
    private normalizeRoleValue;
    private mapUsuario;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: number;
            email: string;
            nombre: string;
            rol: string;
            activo: boolean;
            creado_en: Date;
        };
    }>;
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
        user: {
            id: number;
            email: string;
            nombre: string;
            rol: string;
            activo: boolean;
            creado_en: Date;
        };
    }>;
    getProfile(userId: number): Promise<{
        id: number;
        email: string;
        nombre: string;
        rol: string;
        activo: boolean;
        creado_en: Date;
    }>;
    validateUser(email: string, password: string): Promise<{
        id: number;
        email: string;
        rol: string;
    }>;
}
