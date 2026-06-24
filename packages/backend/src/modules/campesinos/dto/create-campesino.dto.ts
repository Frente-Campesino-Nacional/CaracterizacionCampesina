import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsString, IsInt, IsObject } from 'class-validator';

export class CreateCampesinDto {
  @IsOptional()
  @IsString()
  cedula?: string;

  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  apellido?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  correo?: string;

  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @IsOptional()
  genero?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  municipio?: string;

  @IsOptional()
  direccion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  consejo_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  creado_por?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  asignado_a?: number;

  @IsOptional()
  @IsBoolean()
  tiene_pendientes?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  creado_en?: string;

  @IsOptional()
  @IsDateString()
  actualizado_en?: string;
}
