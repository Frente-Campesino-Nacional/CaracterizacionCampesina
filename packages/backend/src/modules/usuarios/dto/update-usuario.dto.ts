import { IsEmail, IsOptional, MinLength, IsEnum, IsBoolean, IsDateString, IsString } from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  cedula?: string;

  @IsOptional()
  @MinLength(8)
  password?: string;

  @IsOptional()
  nombre?: string;

  @IsOptional()
  apellido?: string;

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
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  consejo_id?: number;

  @IsOptional()
  @IsDateString()
  creado_en?: string;

  @IsOptional()
  @IsDateString()
  actualizado_en?: string;
}

