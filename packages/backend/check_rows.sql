\timing off
\pset format unaligned
\pset fieldsep '|'
\o .\schema_rows.txt
SELECT 'operacional.campesinos' AS table_name, id::text, uuid::text, consejo_id::text, creado_por::text, asignado_a::text FROM operacional.campesinos LIMIT 5;
SELECT 'operacional.consejos' AS table_name, id::text, uuid::text, encargado_id::text FROM operacional.consejos LIMIT 5;
SELECT 'operacional.formularios' AS table_name, id::text, uuid::text, creado_por::text FROM operacional.formularios LIMIT 5;
SELECT 'seguridad.usuarios' AS table_name, id::text, uuid::text, consejo_id::text FROM seguridad.usuarios LIMIT 5;
SELECT 'respuestas.respuesta_form' AS table_name, id::text, uuid::text, formulario_id::text, registro_id::text FROM respuestas.respuesta_form LIMIT 5;
SELECT 'operacional.fotos_perfil' AS table_name, id_fotos::text, persona_id::text FROM operacional.fotos_perfil LIMIT 5;
\o
