-- ==============================================================================
-- MIGRACIÓN SQL: Renombrado de genero -> sexo, id_genero -> id_sexo, 
-- y estandarización de columnas de tiempo created_at/update_at/updated_at -> creado_en/actualizado_en
-- ==============================================================================

BEGIN;

-- 1. Tabla catalogos.generos
ALTER TABLE "catalogos"."generos" RENAME COLUMN "genero" TO "sexo";
ALTER TABLE "catalogos"."generos" RENAME COLUMN "id_genero" TO "id_sexo";
ALTER TABLE "catalogos"."generos" RENAME CONSTRAINT "id_genero_pkey" TO "id_sexo_pkey";

-- 2. Tabla registros.personas
ALTER TABLE "registros"."personas" RENAME COLUMN "genero" TO "sexo";
ALTER TABLE "registros"."personas" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "registros"."personas" RENAME COLUMN "update_at" TO "actualizado_en";
ALTER INDEX IF EXISTS "registros"."idx_personas_genero" RENAME TO "idx_personas_sexo";

-- 3. Tabla operacional.consejos
ALTER TABLE "operacional"."consejos" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "operacional"."consejos" RENAME COLUMN "updated_at" TO "actualizado_en";

-- 4. Tabla operacional.formularios
ALTER TABLE "operacional"."formularios" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "operacional"."formularios" RENAME COLUMN "update_at" TO "actualizado_en";

-- 5. Tabla respuestas.respuesta_form
ALTER TABLE "respuestas"."respuesta_form" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "respuestas"."respuesta_form" RENAME COLUMN "update_at" TO "actualizado_en";

-- 6. Tabla auditoria.historial_cambios
ALTER TABLE "auditoria"."historial_cambios" RENAME COLUMN "created_at" TO "creado_en";

-- 7. Tabla operacional.fotos_perfil
ALTER TABLE "operacional"."fotos_perfil" RENAME COLUMN "created_at" TO "creado_en";
ALTER TABLE "operacional"."fotos_perfil" RENAME COLUMN "updated_at" TO "actualizado_en";

COMMIT;
