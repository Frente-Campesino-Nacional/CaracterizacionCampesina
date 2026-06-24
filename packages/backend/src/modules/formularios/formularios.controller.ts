import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
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

  @Get(':id')
  @ApiOperation({ summary: 'Obtener formulario por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.formulariosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo formulario' })
  create(@Body() createFormularioDto: CreateFormularioDto) {
    return this.formulariosService.create(createFormularioDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar formulario' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateFormularioDto: UpdateFormularioDto) {
    return this.formulariosService.update(id, updateFormularioDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar formulario' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.formulariosService.remove(id);
  }

  @Post(':id/respuestas')
  @ApiOperation({ summary: 'Guardar respuesta de formulario en MongoDB' })
  submitRespuesta(
    @Param('id', ParseIntPipe) id: number,
    @Body() submitFormularioRespuestaDto: SubmitFormularioRespuestaDto,
  ) {
    return this.formulariosService.submitRespuesta(id, submitFormularioRespuestaDto);
  }
}