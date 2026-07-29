import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConsejosService } from './consejos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateConsejoDto } from './dto/create-consejo.dto';
import { UpdateConsejoDto } from './dto/update-consejo.dto';

@ApiTags('Consejos')
@Controller('consejos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConsejosController {
  constructor(private readonly consejosService: ConsejosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los consejos' })
  findAll() {
    return this.consejosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener consejo por ID' })
  findOne(@Param('id') id: string) {
    return this.consejosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo consejo' })
  create(@Body() createConsejoDto: CreateConsejoDto) {
    return this.consejosService.create(createConsejoDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar consejo' })
  update(@Param('id') id: string, @Body() updateConsejoDto: UpdateConsejoDto) {
    return this.consejosService.update(id, updateConsejoDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar consejo' })
  remove(@Param('id') id: string) {
    return this.consejosService.remove(id);
  }
}