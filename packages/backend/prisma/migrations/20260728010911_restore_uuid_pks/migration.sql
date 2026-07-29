/*
  Migration: restore_uuid_pks
  - Restore UUID primary keys to operational and audit tables.
  - Preserve `operacional.fotos_perfil.id_fotos` as VARCHAR(36).
  - Rename existing UUID helper columns to the Prisma PK names.
  - Drop legacy integer identity columns and obsolete schema pieces.
*/

-- Drop foreign keys based on old PK or legacy columns
ALTER TABLE "auditoria"."historial_cambios" DROP CONSTRAINT IF EXISTS "historial_cambios_usuario_id_reg_fkey";
ALTER TABLE "catalogos"."parroquias" DROP CONSTRAINT IF EXISTS "parroquias_municipio_fkey";
ALTER TABLE "operacional"."campesinos" DROP CONSTRAINT IF EXISTS "campesinos_asignado_a_fkey";
ALTER TABLE "operacional"."campesinos" DROP CONSTRAINT IF EXISTS "campesinos_consejo_id_fkey";
ALTER TABLE "operacional"."campesinos" DROP CONSTRAINT IF EXISTS "campesinos_creado_por_fkey";
ALTER TABLE "operacional"."campesinos" DROP CONSTRAINT IF EXISTS "campesinos_genero_fkey";
ALTER TABLE "operacional"."formularios" DROP CONSTRAINT IF EXISTS "formularios_creado_por_fkey";
ALTER TABLE "registros"."personas" DROP CONSTRAINT IF EXISTS "consejo_id_fkey";
ALTER TABLE "registros"."personas" DROP CONSTRAINT IF EXISTS "genero_fkey";
ALTER TABLE "respuestas"."respuesta_form" DROP CONSTRAINT IF EXISTS "respuesta_form_campesino_id_fkey";
ALTER TABLE "respuestas"."respuesta_form" DROP CONSTRAINT IF EXISTS "respuesta_form_encuestador_id_fkey";
ALTER TABLE "respuestas"."respuesta_form" DROP CONSTRAINT IF EXISTS "respuesta_form_formulario_id_fkey";
ALTER TABLE "seguridad"."usuarios" DROP CONSTRAINT IF EXISTS "usuarios_consejo_id_fkey";
ALTER TABLE "seguridad"."usuarios" DROP CONSTRAINT IF EXISTS "usuarios_genero_fkey";
ALTER TABLE "seguridad"."usuarios" DROP CONSTRAINT IF EXISTS "usuarios_rol_fkey";

-- Drop indexes that no longer match the desired schema
DROP INDEX IF EXISTS "catalogos"."generos_genero_key";
DROP INDEX IF EXISTS "operacional"."campesinos_cedula_key";
DROP INDEX IF EXISTS "operacional"."campesinos_uuid_key";
DROP INDEX IF EXISTS "operacional"."consejos_nombre_key";
DROP INDEX IF EXISTS "operacional"."consejos_uuid_key";
DROP INDEX IF EXISTS "operacional"."formularios_uuid_key";
DROP INDEX IF EXISTS "respuestas"."respuesta_form_uuid_key";
DROP INDEX IF EXISTS "respuestas"."idx_respuesta_form_llenado_por";
DROP INDEX IF EXISTS "respuestas"."idx_respuesta_form_sync_status";
DROP INDEX IF EXISTS "seguridad"."usuarios_cedula_key";
DROP INDEX IF EXISTS "seguridad"."usuarios_email_key";
DROP INDEX IF EXISTS "seguridad"."usuarios_uuid_key";
DROP INDEX IF EXISTS "seguridad"."idx_usuarios_nombre_usuario";
DROP INDEX IF EXISTS "seguridad"."idx_usuarios_sync_status";
DROP INDEX IF EXISTS "operacional"."idx_campesinos_sync_status";

-- Rename catalog PK constraints to Prisma mapping names
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'catalogos' AND cl.relname = 'estados' AND c.conname = 'estados_pkey'
  ) THEN
    ALTER TABLE "catalogos"."estados" RENAME CONSTRAINT "estados_pkey" TO "id_edo_pkey";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'catalogos' AND cl.relname = 'generos' AND c.conname = 'generos_pkey'
  ) THEN
    ALTER TABLE "catalogos"."generos" RENAME CONSTRAINT "generos_pkey" TO "id_genero_pkey";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'catalogos' AND cl.relname = 'municipios' AND c.conname = 'municipios_pkey'
  ) THEN
    ALTER TABLE "catalogos"."municipios" RENAME CONSTRAINT "municipios_pkey" TO "id_municipio_pkey";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'catalogos' AND cl.relname = 'parroquias' AND c.conname = 'parroquias_pkey'
  ) THEN
    ALTER TABLE "catalogos"."parroquias" RENAME CONSTRAINT "parroquias_pkey" TO "id_parroquia_pkey";
  END IF;
END $$;

-- Rename FK constraint name on municipios
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'catalogos' AND cl.relname = 'municipios' AND c.conname = 'municipios_estado_fkey'
  ) THEN
    ALTER TABLE "catalogos"."municipios" RENAME CONSTRAINT "municipios_estado_fkey" TO "id_estado_fkey";
  END IF;
END $$;

-- Historico: switch PK from integer id to UUID id_historial
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auditoria' AND table_name = 'historial_cambios' AND column_name = 'id_historial'
  ) THEN
    ALTER TABLE "auditoria"."historial_cambios"
      ADD COLUMN "id_historial" UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
END $$;

ALTER TABLE "auditoria"."historial_cambios"
  ALTER COLUMN "tabla_nombre" TYPE VARCHAR(63),
  ALTER COLUMN "accion" TYPE VARCHAR(10),
  ALTER COLUMN "origen" TYPE VARCHAR(20),
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "auditoria"."historial_cambios" WHERE "usuario_id_reg" IS NOT NULL) THEN
    ALTER TABLE "auditoria"."historial_cambios"
      ALTER COLUMN "usuario_id_reg" TYPE UUID USING "usuario_id_reg"::text::uuid;
  END IF;

  IF EXISTS (SELECT 1 FROM "auditoria"."historial_cambios" WHERE "registro_id" IS NOT NULL) THEN
    ALTER TABLE "auditoria"."historial_cambios"
      ALTER COLUMN "registro_id" TYPE UUID USING "registro_id"::text::uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'auditoria.historial_cambios'::regclass AND conname = 'historial_cambios_pkey'
  ) THEN
    ALTER TABLE "auditoria"."historial_cambios"
      DROP CONSTRAINT "historial_cambios_pkey";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'auditoria.historial_cambios'::regclass AND conname = 'id_auditoria_fkey'
  ) THEN
    ALTER TABLE "auditoria"."historial_cambios"
      ADD CONSTRAINT "id_auditoria_fkey" PRIMARY KEY ("id_historial");
  END IF;
END $$;

ALTER TABLE "auditoria"."historial_cambios" DROP COLUMN IF EXISTS "id";

-- Generos: rename id_gen to id_genero
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'catalogos'
      AND table_name = 'generos'
      AND column_name = 'id_gen'
  ) THEN
    ALTER TABLE "catalogos"."generos" RENAME COLUMN "id_gen" TO "id_genero";
  END IF;
END $$;

-- Campesinos: make uuid the PK and remove legacy columns
ALTER TABLE "operacional"."campesinos"
  DROP CONSTRAINT IF EXISTS "campesinos_pkey";
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'campesinos'
      AND column_name = 'uuid'
  ) THEN
    ALTER TABLE "operacional"."campesinos" RENAME COLUMN "uuid" TO "id_campesinos";
  END IF;
END $$;
ALTER TABLE "operacional"."campesinos"
  ALTER COLUMN "id_campesinos" SET NOT NULL,
  ALTER COLUMN "id_campesinos" SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "operacional"."campesinos" WHERE "creado_por" IS NOT NULL) THEN
    ALTER TABLE "operacional"."campesinos"
      ALTER COLUMN "creado_por" TYPE UUID USING "creado_por"::text::uuid;
  END IF;

  IF EXISTS (SELECT 1 FROM "operacional"."campesinos" WHERE "asignado_a" IS NOT NULL) THEN
    ALTER TABLE "operacional"."campesinos"
      ALTER COLUMN "asignado_a" TYPE UUID USING "asignado_a"::text::uuid;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'campesinos'
      AND column_name = 'creado_en'
  ) THEN
    ALTER TABLE "operacional"."campesinos" RENAME COLUMN "creado_en" TO "created_at";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'campesinos'
      AND column_name = 'actualizado_en'
  ) THEN
    ALTER TABLE "operacional"."campesinos" RENAME COLUMN "actualizado_en" TO "updated_at";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'campesinos'
      AND column_name = 'tiene_pendientes'
  ) THEN
    ALTER TABLE "operacional"."campesinos" RENAME COLUMN "tiene_pendientes" TO "formularios_pendientes";
  END IF;
END $$;
ALTER TABLE "operacional"."campesinos"
  DROP COLUMN IF EXISTS "id",
  DROP COLUMN IF EXISTS "apellido",
  DROP COLUMN IF EXISTS "cedula",
  DROP COLUMN IF EXISTS "consejo_id",
  DROP COLUMN IF EXISTS "correo",
  DROP COLUMN IF EXISTS "direccion",
  DROP COLUMN IF EXISTS "estado",
  DROP COLUMN IF EXISTS "fecha_nacimiento",
  DROP COLUMN IF EXISTS "genero",
  DROP COLUMN IF EXISTS "municipio",
  DROP COLUMN IF EXISTS "parroquia",
  DROP COLUMN IF EXISTS "nombre",
  DROP COLUMN IF EXISTS "telefono",
  DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "operacional"."campesinos"
  ADD COLUMN IF NOT EXISTS "sync_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "sync_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "sync_error" TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'operacional.campesinos'::regclass
      AND conname = 'id_campesinos_pkey'
  ) THEN
    ALTER TABLE "operacional"."campesinos"
      ADD CONSTRAINT "id_campesinos_pkey" PRIMARY KEY ("id_campesinos");
  END IF;
END $$;

-- Consejos: rename uuid to consejo_id and preserve existing mappings
ALTER TABLE "operacional"."consejos"
  DROP CONSTRAINT IF EXISTS "consejos_pkey";
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'consejos'
      AND column_name = 'uuid'
  ) THEN
    ALTER TABLE "operacional"."consejos" RENAME COLUMN "uuid" TO "consejo_id";
  END IF;
END $$;
ALTER TABLE "operacional"."consejos"
  ALTER COLUMN "consejo_id" SET NOT NULL,
  ALTER COLUMN "consejo_id" SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "operacional"."consejos" WHERE "encargado_id" IS NOT NULL) THEN
    ALTER TABLE "operacional"."consejos"
      ALTER COLUMN "encargado_id" TYPE UUID USING "encargado_id"::text::uuid;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'consejos'
      AND column_name = 'nombre'
  ) THEN
    ALTER TABLE "operacional"."consejos" RENAME COLUMN "nombre" TO "nombre_consejo";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'consejos'
      AND column_name = 'creado_en'
  ) THEN
    ALTER TABLE "operacional"."consejos" RENAME COLUMN "creado_en" TO "created_at";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'consejos'
      AND column_name = 'actualizado_en'
  ) THEN
    ALTER TABLE "operacional"."consejos" RENAME COLUMN "actualizado_en" TO "updated_at";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'consejos'
      AND column_name = 'parroquia'
  ) THEN
    ALTER TABLE "operacional"."consejos" RENAME COLUMN "parroquia" TO "parrroquia";
  END IF;
END $$;
ALTER TABLE "operacional"."consejos"
  ALTER COLUMN "parrroquia" TYPE INTEGER USING parrroquia::integer;
ALTER TABLE "operacional"."consejos"
  DROP COLUMN IF EXISTS "id",
  DROP COLUMN IF EXISTS "encargado_tipo",
  DROP COLUMN IF EXISTS "estado",
  DROP COLUMN IF EXISTS "municipio";
ALTER TABLE "operacional"."consejos"
  ADD COLUMN IF NOT EXISTS "direccion_csj" TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'operacional.consejos'::regclass
      AND conname = 'consejo_id_pkey'
  ) THEN
    ALTER TABLE "operacional"."consejos"
      ADD CONSTRAINT "consejo_id_pkey" PRIMARY KEY ("consejo_id");
  END IF;
END $$;

-- Formularios: rename uuid to id_formulario
ALTER TABLE "operacional"."formularios"
  DROP CONSTRAINT IF EXISTS "formularios_pkey";
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'formularios'
      AND column_name = 'uuid'
  ) THEN
    ALTER TABLE "operacional"."formularios" RENAME COLUMN "uuid" TO "id_formulario";
  END IF;
END $$;
ALTER TABLE "operacional"."formularios"
  ALTER COLUMN "id_formulario" SET NOT NULL,
  ALTER COLUMN "id_formulario" SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "operacional"."formularios" WHERE "creado_por" IS NOT NULL) THEN
    ALTER TABLE "operacional"."formularios"
      ALTER COLUMN "creado_por" TYPE UUID USING "creado_por"::text::uuid;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'formularios'
      AND column_name = 'creado_en'
  ) THEN
    ALTER TABLE "operacional"."formularios" RENAME COLUMN "creado_en" TO "created_at";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'operacional'
      AND table_name = 'formularios'
      AND column_name = 'actualizado_en'
  ) THEN
    ALTER TABLE "operacional"."formularios" RENAME COLUMN "actualizado_en" TO "update_at";
  END IF;
END $$;
ALTER TABLE "operacional"."formularios"
  DROP COLUMN IF EXISTS "id";
ALTER TABLE "operacional"."formularios"
  ADD CONSTRAINT "id_formularios_pkey" PRIMARY KEY ("id_formulario");

-- Fotos Perfil: preserve id_fotos as varchar(36) and make persona_id UUID
ALTER TABLE "operacional"."fotos_perfil" RENAME CONSTRAINT "fotos_perfil_pkey" TO "id_fotos_pky";
ALTER TABLE "operacional"."fotos_perfil"
  ALTER COLUMN "id_fotos" TYPE VARCHAR(36) USING "id_fotos"::VARCHAR(36),
  ALTER COLUMN "persona_id" TYPE UUID USING NULL,
  ALTER COLUMN "updated_at" TYPE TIMESTAMP(6),
  ALTER COLUMN "last_synced_at" TYPE TIMESTAMPTZ(6);
ALTER INDEX IF EXISTS "operacional"."fotos_perfil_persona_id_key" RENAME TO "persona_id_unq";

-- Personas: convert consejo_id to UUID
ALTER TABLE "registros"."personas"
  ALTER COLUMN "consejo_id" TYPE UUID USING consejo_id::uuid;

-- Respuesta Form: rename uuid to id_respuesta and remove legacy columns
ALTER TABLE "respuestas"."respuesta_form"
  DROP CONSTRAINT IF EXISTS "respuesta_form_pkey";
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'respuestas'
      AND table_name = 'respuesta_form'
      AND column_name = 'uuid'
  ) THEN
    ALTER TABLE "respuestas"."respuesta_form" RENAME COLUMN "uuid" TO "id_respuesta";
  END IF;
END $$;
ALTER TABLE "respuestas"."respuesta_form"
  ALTER COLUMN "id_respuesta" SET NOT NULL,
  ALTER COLUMN "id_respuesta" SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "respuestas"."respuesta_form" WHERE "formulario_id" IS NOT NULL) THEN
    ALTER TABLE "respuestas"."respuesta_form"
      ALTER COLUMN "formulario_id" TYPE UUID USING "formulario_id"::text::uuid;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'respuestas'
      AND table_name = 'respuesta_form'
      AND column_name = 'creado_en'
  ) THEN
    ALTER TABLE "respuestas"."respuesta_form" RENAME COLUMN "creado_en" TO "created_at";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'respuestas'
      AND table_name = 'respuesta_form'
      AND column_name = 'actualizado_en'
  ) THEN
    ALTER TABLE "respuestas"."respuesta_form" RENAME COLUMN "actualizado_en" TO "update_at";
  END IF;
END $$;
ALTER TABLE "respuestas"."respuesta_form"
  DROP COLUMN IF EXISTS "id",
  DROP COLUMN IF EXISTS "campesino_id",
  DROP COLUMN IF EXISTS "encuestador_id",
  DROP COLUMN IF EXISTS "guardado_en_postgres",
  DROP COLUMN IF EXISTS "metadata",
  DROP COLUMN IF EXISTS "registro_id",
  DROP COLUMN IF EXISTS "capturado_en";
ALTER TABLE "respuestas"."respuesta_form"
  ADD COLUMN IF NOT EXISTS "llenado_por" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "sync_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "sync_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "sync_error" TEXT;
ALTER TABLE "respuestas"."respuesta_form"
  ADD CONSTRAINT "id_respuesta_pkey" PRIMARY KEY ("id_respuesta");

-- Usuarios: rename uuid to id_usuario and normalize columns
ALTER TABLE "seguridad"."usuarios"
  DROP CONSTRAINT IF EXISTS "usuarios_pkey";
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'seguridad'
      AND table_name = 'usuarios'
      AND column_name = 'uuid'
  ) THEN
    ALTER TABLE "seguridad"."usuarios" RENAME COLUMN "uuid" TO "id_usuario";
  END IF;
END $$;
ALTER TABLE "seguridad"."usuarios"
  ALTER COLUMN "id_usuario" SET NOT NULL,
  ALTER COLUMN "id_usuario" SET DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "seguridad"."usuarios" WHERE "consejo_id" IS NOT NULL) THEN
    ALTER TABLE "seguridad"."usuarios"
      ALTER COLUMN "consejo_id" TYPE UUID USING "consejo_id"::text::uuid;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'seguridad'
      AND table_name = 'usuarios'
      AND column_name = 'rol'
  ) THEN
    ALTER TABLE "seguridad"."usuarios" RENAME COLUMN "rol" TO "id_rol";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'seguridad'
      AND table_name = 'usuarios'
      AND column_name = 'nombre'
  ) THEN
    ALTER TABLE "seguridad"."usuarios" RENAME COLUMN "nombre" TO "nombre_usuario";
  END IF;
END $$;
ALTER TABLE "seguridad"."usuarios"
  ALTER COLUMN "consejo_id" TYPE UUID USING consejo_id::uuid;
ALTER TABLE "seguridad"."usuarios"
  DROP COLUMN IF EXISTS "activo",
  DROP COLUMN IF EXISTS "actualizado_en",
  DROP COLUMN IF EXISTS "apellido",
  DROP COLUMN IF EXISTS "cedula",
  DROP COLUMN IF EXISTS "creado_en",
  DROP COLUMN IF EXISTS "direccion",
  DROP COLUMN IF EXISTS "email",
  DROP COLUMN IF EXISTS "estado",
  DROP COLUMN IF EXISTS "fecha_nacimiento",
  DROP COLUMN IF EXISTS "genero",
  DROP COLUMN IF EXISTS "municipio",
  DROP COLUMN IF EXISTS "parroquia",
  DROP COLUMN IF EXISTS "numero_telefono";
ALTER TABLE "seguridad"."usuarios"
  ADD COLUMN IF NOT EXISTS "creado_por" UUID,
  ADD COLUMN IF NOT EXISTS "sync_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "sync_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "sync_error" TEXT;
ALTER TABLE "seguridad"."usuarios"
  ADD CONSTRAINT "id_usu_pkey" PRIMARY KEY ("id_usuario");

-- Recreate indexes required by the current Prisma schema
CREATE INDEX IF NOT EXISTS "idx_campesinos_creado_por" ON "operacional"."campesinos"("creado_por");
CREATE INDEX IF NOT EXISTS "idx_campesinos_asignado_a" ON "operacional"."campesinos"("asignado_a");
CREATE INDEX IF NOT EXISTS "idx_consejos_parrroquia" ON "operacional"."consejos"("parrroquia");
CREATE INDEX IF NOT EXISTS "idx_personas_consejo_id" ON "registros"."personas"("consejo_id");
CREATE INDEX IF NOT EXISTS "idx_respuesta_form_formulario" ON "respuestas"."respuesta_form"("formulario_id");
CREATE INDEX IF NOT EXISTS "idx_respuesta_form_llenado_por" ON "respuestas"."respuesta_form"("llenado_por");
CREATE INDEX IF NOT EXISTS "idx_respuesta_form_sync_status" ON "respuestas"."respuesta_form"("sync_status");
CREATE UNIQUE INDEX IF NOT EXISTS "nombre_usuario" ON "seguridad"."usuarios"("nombre_usuario");
CREATE INDEX IF NOT EXISTS "idx_usuarios_id_rol" ON "seguridad"."usuarios"("id_rol");
CREATE INDEX IF NOT EXISTS "idx_usuarios_sync_status" ON "seguridad"."usuarios"("sync_status");

-- Recreate foreign keys with UUID PK semantics
ALTER TABLE "catalogos"."parroquias" ADD CONSTRAINT "id_municipios_pkey" FOREIGN KEY ("municipio") REFERENCES "catalogos"."municipios"("id_municipio") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "operacional"."consejos" ADD CONSTRAINT "encargado_fkey" FOREIGN KEY ("encargado_id") REFERENCES "seguridad"."usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operacional"."consejos" ADD CONSTRAINT "parroquia_fkey" FOREIGN KEY ("parrroquia") REFERENCES "catalogos"."parroquias"("id_parroquia") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "seguridad"."usuarios" ADD CONSTRAINT "creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "seguridad"."usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "seguridad"."usuarios" ADD CONSTRAINT "id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "seguridad"."roles"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "seguridad"."usuarios" ADD CONSTRAINT "id_usuarios_fky" FOREIGN KEY ("id_usuario") REFERENCES "registros"."personas"("id_personas") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operacional"."campesinos" ADD CONSTRAINT "asignado_a_fkey" FOREIGN KEY ("asignado_a") REFERENCES "seguridad"."usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operacional"."campesinos" ADD CONSTRAINT "creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "seguridad"."usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operacional"."campesinos" ADD CONSTRAINT "id_campesinos_fkey" FOREIGN KEY ("id_campesinos") REFERENCES "registros"."personas"("id_personas") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operacional"."formularios" ADD CONSTRAINT "creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "seguridad"."usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "respuestas"."respuesta_form" ADD CONSTRAINT "formulario_id_pkey" FOREIGN KEY ("formulario_id") REFERENCES "operacional"."formularios"("id_formulario") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "respuestas"."respuesta_form" ADD CONSTRAINT "llenado_por_fkey" FOREIGN KEY ("llenado_por") REFERENCES "seguridad"."usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "auditoria"."historial_cambios" ADD CONSTRAINT "usuario_id_reg_fkey" FOREIGN KEY ("usuario_id_reg") REFERENCES "seguridad"."usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operacional"."fotos_perfil" ADD CONSTRAINT "persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "registros"."personas"("id_personas") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registros"."personas" ADD CONSTRAINT "consejo_id_fkey" FOREIGN KEY ("consejo_id") REFERENCES "operacional"."consejos"("consejo_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "registros"."personas" ADD CONSTRAINT "genero_fkey" FOREIGN KEY ("genero") REFERENCES "catalogos"."generos"("id_genero") ON DELETE NO ACTION ON UPDATE NO ACTION;
