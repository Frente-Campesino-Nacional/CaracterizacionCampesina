import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FormulariosService } from './formularios.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateFormularioDto } from './dto/create-formulario.dto';
import { SubmitFormularioRespuestaDto } from './dto/submit-formulario-respuesta.dto';
import { UpdateFormularioDto } from './dto/update-formulario.dto';

@ApiTags('Formularios')
@Controller('formularios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FormulariosController {
  constructor(private readonly formulariosService: FormulariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los formularios' })
  findAll() {
    return this.formulariosService.findAll();
  }

  @Get('filtros/preguntas')
  @ApiOperation({ summary: 'Listar preguntas de filtro' })
  listFilterQuestions() {
    return this.formulariosService.listFilterQuestions();
  }

  @Get('filtros/resultados')
  @ApiOperation({ summary: 'Listar resultados de filtro' })
  listFilterResults(
    @Query('formulario_id') formularioId: string,
    @Query('pregunta_id') preguntaId: string,
  ) {
    return this.formulariosService.listFilterResults(formularioId, preguntaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener formulario por ID' })
  findOne(@Param('id') id: string) {
    return this.formulariosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo formulario' })
  create(@Body() createFormularioDto: CreateFormularioDto) {
    return this.formulariosService.create(createFormularioDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar formulario' })
  update(@Param('id') id: string, @Body() updateFormularioDto: UpdateFormularioDto) {
    return this.formulariosService.update(id, updateFormularioDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar formulario' })
  remove(@Param('id') id: string) {
    return this.formulariosService.remove(id);
  }

  @Post(':id/respuestas')
  @ApiOperation({ summary: 'Guardar respuesta de formulario en PostgreSQL' })
  submitRespuesta(
    @Request() req,
    @Param('id') id: string,
    @Body() submitFormularioRespuestaDto: SubmitFormularioRespuestaDto,
  ) {
    return this.formulariosService.submitRespuesta(id, submitFormularioRespuestaDto, req.user?.id);
  }
}