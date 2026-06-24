import { Module } from '@nestjs/common';
import { GenerosController } from './generos.controller';
import { GenerosService } from './generos.service';

@Module({
  controllers: [GenerosController],
  providers: [GenerosService],
  exports: [GenerosService],
})
export class GenerosModule {}