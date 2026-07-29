import { Type } from 'class-transformer';
import { IsOptional, IsBoolean, IsDateString, IsString, IsInt, IsObject } from 'class-validator';

export class UpdateCampesinDto {
  @IsOptional()
  @IsString()
  cedula?: string;

  @IsOptional()
  nombre?: string;

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
  consejo_id?: string | number | null;

  @IsOptional()
  creado_por?: string | number | null;

  @IsOptional()
  asignado_a?: string | number | null;

  @IsOptional()
  @IsBoolean()
  tiene_pendientes?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

}
