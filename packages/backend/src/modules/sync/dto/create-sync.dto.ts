import { IsNotEmpty, IsOptional, IsEnum, IsInt, IsObject, IsString, IsDateString } from 'class-validator';

export class CreateSyncDto {
  @IsNotEmpty()
  entidad: string;

  @IsNotEmpty()
  @IsString()
  entidad_id: string;

  @IsNotEmpty()
  operacion: string;

  @IsNotEmpty()
  @IsObject()
  datos: object;

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
