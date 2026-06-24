import { Module } from '@nestjs/common';
import { CampesinosController } from './campesinos.controller';
import { CampesinosService } from './campesinos.service';

@Module({
  controllers: [CampesinosController],
  providers: [CampesinosService],
  exports: [CampesinosService],
})
export class CampesinosModule {}