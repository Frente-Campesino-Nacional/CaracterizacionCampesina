import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUsuarioDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  nombre_usuario?: string;

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
  consejo_id?: string | number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

}

