import { IsOptional, IsEnum, IsInt, IsObject, IsString, IsDateString } from 'class-validator';

export class UpdateSyncDto {
  @IsOptional()
  entidad?: string;

  @IsOptional()
  @IsString()
  entidad_id?: string;

  @IsOptional()
  operacion?: string;

  @IsOptional()
  @IsObject()
  datos?: object;

  @IsOptional()
  @IsEnum(['PENDIENTE', 'PROCESADO', 'ERROR'], { message: 'Estado debe ser PENDIENTE, PROCESADO o ERROR' })
  estado?: string;

  @IsOptional()
  @IsInt()
  intentos?: number;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsDateString()
  procesado_en?: string;
}
