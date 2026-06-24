import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class SubmitFormularioRespuestaDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  campesino_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  encuestador_id?: number;

  @IsNotEmpty()
  @IsObject()
  respuestas: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  capturado_en?: string;
}
