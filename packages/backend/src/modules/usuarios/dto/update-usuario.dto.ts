import { IsEmail, IsOptional, MinLength, IsBoolean, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._%+-]+@gmail\.com$/i, { message: 'El correo electrónico debe pertenecer al dominio @gmail.com' })
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
  @IsString()
  rol?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{7,15}$/, { message: 'El número telefónico debe contener entre 7 y 15 dígitos (ejemplo: 04141234567)' })
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

