import { IsOptional, IsDateString } from 'class-validator';

export class UpdateConsejoDto {
  @IsOptional()
  nombre?: string;

  @IsOptional()
  descripcion?: string;

  @IsOptional()
  estado?: string;

  @IsOptional()
  municipio?: string;

  @IsOptional()
  encargado_tipo?: string;

  @IsOptional()
  encargado_id?: number;

  @IsOptional()
  @IsDateString()
  creado_en?: string;

  @IsOptional()
  @IsDateString()
  actualizado_en?: string;
}
