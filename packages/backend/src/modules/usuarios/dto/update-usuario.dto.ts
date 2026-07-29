import { IsEmail, IsOptional, MinLength, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nombre_usuario?: string;

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
  @IsString()
  rol?: string;

  @IsOptional()
  numero_telefono?: string;

  @IsOptional()
  @IsString()
  fecha_nacimiento?: string;

  @IsOptional()
  genero?: string;

  @IsOptional()
  @Type(() => Number)
  estado_id?: number;

  @IsOptional()
  @Type(() => Number)
  municipio_id?: number;

  @IsOptional()
  @Type(() => Number)
  parroquia_id?: number;

  @IsOptional()
  direccion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  consejo_id?: string | number | null;

}

