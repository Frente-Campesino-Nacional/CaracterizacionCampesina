import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { RolesModule } from './modules/roles/roles.module';
import { ConsejosModule } from './modules/consejos/consejos.module';
import { CampesinosModule } from './modules/campesinos/campesinos.module';
import { GenerosModule } from './modules/generos/generos.module';
import { FormulariosModule } from './modules/formularios/formularios.module';
import { SyncModule } from './modules/sync/sync.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    AuthModule,
    UsuariosModule,
    RolesModule,
    ConsejosModule,
    CampesinosModule,
    GenerosModule,
    FormulariosModule,
    SyncModule,
  ],
  controllers: [AppController],
})
export class AppModule {}