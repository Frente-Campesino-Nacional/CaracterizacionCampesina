import { Module } from '@nestjs/common';
import { ConsejosController } from './consejos.controller';
import { ConsejosService } from './consejos.service';

@Module({
  controllers: [ConsejosController],
  providers: [ConsejosService],
  exports: [ConsejosService],
})
export class ConsejosModule {}