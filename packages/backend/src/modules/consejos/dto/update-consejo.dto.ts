import { Type } from 'class-transformer';
import { IsOptional, IsDateString, IsInt } from 'class-validator';

export class UpdateConsejoDto {
  @IsOptional()
  nombre?: string;

  @IsOptional()
  descripcion?: string;

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
  encargado_tipo?: string;

  @IsOptional()
  encargado_id?: string | number;

}
