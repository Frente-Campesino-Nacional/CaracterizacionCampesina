import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsString, IsInt, IsObject, IsEmail, Matches } from 'class-validator';

export class CreateCampesinDto {
  @IsOptional()
  @IsString()
  cedula?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { message: 'El nombre solo debe contener letras y espacios' })
  nombre: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { message: 'El apellido solo debe contener letras y espacios' })
  apellido?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{7,15}$/, { message: 'El número telefónico debe contener entre 7 y 15 dígitos (ejemplo: 04141234567)' })
  telefono?: string;


  @IsOptional()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9._%+-]+@gmail\.com$/i, { message: 'El correo electrónico debe pertenecer al dominio @gmail.com' })
  correo?: string;


  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @IsOptional()
  sexo?: string;

  @IsOptional()
  genero?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  estado_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  municipio_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parroquia_id?: number;

  @IsOptional()
  direccion?: string;

  @IsOptional()
  consejo_id?: string | number;

  @IsOptional()
  creado_por?: string | number;

  @IsOptional()
  asignado_a?: string | number;

  @IsOptional()
  @IsBoolean()
  tiene_pendientes?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

}
