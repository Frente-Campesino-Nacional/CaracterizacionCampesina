import { IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateConsejoDto {
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  descripcion?: string;

  @IsNotEmpty()
  estado: string;

  @IsNotEmpty()
  municipio: string;

  @IsNotEmpty()
  encargado_tipo: string;

  @IsNotEmpty()
  encargado_id: number;

  @IsOptional()
  @IsDateString()
  creado_en?: string;

  @IsOptional()
  @IsDateString()
  actualizado_en?: string;
}
