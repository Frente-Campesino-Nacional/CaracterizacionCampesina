\timing off
\pset format unaligned
\pset fieldsep '|'
SELECT table_schema,table_name,column_name,data_type,is_nullable,coalesce(column_default,'NULL')
FROM information_schema.columns
WHERE (table_schema, table_name) IN (('auditoria','historial_cambios'),('operacional','campesinos'),('operacional','consejos'),('operacional','formularios'),('operacional','fotos_perfil'),('registros','personas'),('respuestas','respuesta_form'),('seguridad','usuarios'))
ORDER BY table_schema, table_name, ordinal_position;

SELECT nsp.nspname, c.relname, con.conname, contype, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_namespace nsp ON c.relnamespace = nsp.oid
WHERE (nsp.nspname, c.relname) IN (('auditoria','historial_cambios'),('operacional','campesinos'),('operacional','consejos'),('operacional','formularios'),('operacional','fotos_perfil'),('registros','personas'),('respuestas','respuesta_form'),('seguridad','usuarios'))
ORDER BY nsp.nspname, c.relname, contype, con.conname;
