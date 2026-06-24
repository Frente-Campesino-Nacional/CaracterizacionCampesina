import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    getProfile(req: any): Promise<{
        id: number;
        email: string;
        nombre: string;
        rol: string;
        activo: boolean;
        creado_en: Date;
    }>;
}
