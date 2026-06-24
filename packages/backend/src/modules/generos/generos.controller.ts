import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GenerosService } from './generos.service';

@ApiTags('Generos')
@Controller('generos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GenerosController {
  constructor(private readonly generosService: GenerosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de géneros' })
  findAll() {
    return this.generosService.findAll();
  }
}