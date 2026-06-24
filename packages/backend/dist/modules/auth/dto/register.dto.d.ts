export declare class RegisterDto {
    email: string;
    password: string;
    nombre: string;
    apellido?: string;
    rol?: 'admin' | 'administrador' | 'encuestador';
}
