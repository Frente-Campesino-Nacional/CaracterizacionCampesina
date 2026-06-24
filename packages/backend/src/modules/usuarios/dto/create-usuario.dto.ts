import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsEnum, IsBoolean, IsDateString, IsString } from 'class-validator';

export class CreateUsuarioDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  cedula?: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  nombre: string;

  @IsNotEmpty()
  apellido: string;

  @IsOptional()
  @IsEnum(['admin', 'administrador', 'encuestador'], { message: 'El rol debe ser administrador o encuestador' })
  rol?: 'admin' | 'administrador' | 'encuestador';
  
  @IsOptional()
  numero_telefono?: string;

  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @IsOptional()
  genero?: string;

  @IsOptional()
  estado?: string;

  @IsOptional()
  municipio?: string;

  @IsOptional()
  direccion?: string;

  @IsOptional()
  consejo_id?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsDateString()
  creado_en?: string;

  @IsOptional()
  @IsDateString()
  actualizado_en?: string;
}

