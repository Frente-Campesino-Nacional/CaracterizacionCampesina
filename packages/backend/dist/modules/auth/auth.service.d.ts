import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    private findUsuarioAuthRecord;
    private resolveRoleId;
    private normalizeCatalogValue;
    private normalizeRoleValue;
    private mapUsuario;
    private validatePassword;
    private migratePlaintextPassword;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            nombre: string;
            apellido: string;
            telefono: string;
            rol: string;
            consejo_id: string;
            activo: boolean;
            creado_en: Date;
        };
    }>;
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            nombre: string;
            apellido: string;
            telefono: string;
            rol: string;
            consejo_id: string;
            activo: boolean;
            creado_en: Date;
        };
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        nombre: string;
        apellido: string;
        telefono: string;
        rol: string;
        consejo_id: string;
        activo: boolean;
        creado_en: Date;
    }>;
    validateUser(email: string, password: string): Promise<{
        id: string;
        email: string;
        rol: string;
    }>;
}
