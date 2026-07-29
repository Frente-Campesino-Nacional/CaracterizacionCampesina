DO SEED_OK
DECLARE
  v_parroquia integer;
  v_persona_admin uuid;
  v_persona_enc uuid;
  v_user_admin uuid;
  v_user_enc uuid;
  v_consejo uuid;
  v_persona_camp1 uuid;
  v_persona_camp2 uuid;
BEGIN
  SELECT id_parroquia INTO v_parroquia FROM catalogos.parroquias ORDER BY id_parroquia LIMIT 1;

  INSERT INTO registros.personas (id_personas, nombre, apellido, tipo_cedula, cedula, fecha_nacimiento, parroquia, direccion_usuario, email, numero_telefonico, genero, created_at, update_at, sync_status, sync_attempts, last_synced_at, sync_error)
  VALUES (gen_random_uuid(), 'Ana', 'García', 'V', '12345678', '1990-01-15', v_parroquia, 'Calle Principal', 'admin@test.com', '04121234567', 1, now(), now(), 'synced', 0, now(), NULL)
  ON CONFLICT (cedula) DO NOTHING;
  SELECT id_personas INTO v_persona_admin FROM registros.personas WHERE cedula = '12345678';

  INSERT INTO seguridad.usuarios (id_usuario, nombre_usuario, password_hash, id_rol, creado_por, sync_status, sync_attempts, last_synced_at, sync_error)
  VALUES (v_persona_admin, 'admin', '$2a$10$ewzJbBPfZ.w4tVJRJ84Djux6.cutF1OIruCpTj9VWANxyo9SDjuT2', 1, NULL, 'synced', 0, now(), NULL)
  ON CONFLICT (nombre_usuario) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        id_rol = EXCLUDED.id_rol,
        creado_por = EXCLUDED.creado_por;
  SELECT id_usuario INTO v_user_admin FROM seguridad.usuarios WHERE nombre_usuario = 'admin';

  INSERT INTO registros.personas (id_personas, nombre, apellido, tipo_cedula, cedula, fecha_nacimiento, parroquia, direccion_usuario, email, numero_telefonico, genero, created_at, update_at, sync_status, sync_attempts, last_synced_at, sync_error)
  VALUES (gen_random_uuid(), 'Luis', 'Pérez', 'V', '87654321', '1992-05-20', v_parroquia, 'Avenida Secundaria', 'encuestador@test.com', '04129876543', 2, now(), now(), 'synced', 0, now(), NULL)
  ON CONFLICT (cedula) DO NOTHING;
  SELECT id_personas INTO v_persona_enc FROM registros.personas WHERE cedula = '87654321';

  INSERT INTO seguridad.usuarios (id_usuario, nombre_usuario, password_hash, id_rol, creado_por, sync_status, sync_attempts, last_synced_at, sync_error)
  VALUES (v_persona_enc, 'encuestador', '$2a$10$ewzJbBPfZ.w4tVJRJ84Djux6.cutF1OIruCpTj9VWANxyo9SDjuT2', 2, v_user_admin, 'synced', 0, now(), NULL)
  ON CONFLICT (nombre_usuario) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        id_rol = EXCLUDED.id_rol,
        creado_por = EXCLUDED.creado_por;
  SELECT id_usuario INTO v_user_enc FROM seguridad.usuarios WHERE nombre_usuario = 'encuestador';

  INSERT INTO operacional.consejos (consejo_id, nombre_consejo, descripcion, parrroquia, direccion_csj, encargado_id, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Consejo de Prueba', 'Consejo creado para pruebas', v_parroquia, 'Calle del Consejo', v_user_enc, now(), now())
  ON CONFLICT DO NOTHING;
  SELECT consejo_id INTO v_consejo FROM operacional.consejos WHERE nombre_consejo = 'Consejo de Prueba';

  INSERT INTO registros.personas (id_personas, nombre, apellido, tipo_cedula, cedula, fecha_nacimiento, parroquia, direccion_usuario, email, numero_telefonico, genero, consejo_id, created_at, update_at, sync_status, sync_attempts, last_synced_at, sync_error)
  VALUES (gen_random_uuid(), 'Carlos', 'Mendoza', 'V', '11111111', '1985-08-10', v_parroquia, 'Casa 1', 'campesino1@test.com', '04121111111', 1, v_consejo, now(), now(), 'synced', 0, now(), NULL)
  ON CONFLICT (cedula) DO NOTHING;
  SELECT id_personas INTO v_persona_camp1 FROM registros.personas WHERE cedula = '11111111';

  INSERT INTO operacional.campesinos (id_campesinos, creado_por, asignado_a, formularios_pendientes, sync_status, sync_attempts, last_synced_at, sync_error)
  VALUES (v_persona_camp1, v_user_enc, v_user_enc, false, 'synced', 0, now(), NULL)
  ON CONFLICT (id_campesinos) DO NOTHING;

  INSERT INTO registros.personas (id_personas, nombre, apellido, tipo_cedula, cedula, fecha_nacimiento, parroquia, direccion_usuario, email, numero_telefonico, genero, consejo_id, created_at, update_at, sync_status, sync_attempts, last_synced_at, sync_error)
  VALUES (gen_random_uuid(), 'María', 'López', 'V', '22222222', '1990-12-05', v_parroquia, 'Casa 2', 'campesino2@test.com', '04122222222', 2, v_consejo, now(), now(), 'synced', 0, now(), NULL)
  ON CONFLICT (cedula) DO NOTHING;
  SELECT id_personas INTO v_persona_camp2 FROM registros.personas WHERE cedula = '22222222';

  INSERT INTO operacional.campesinos (id_campesinos, creado_por, asignado_a, formularios_pendientes, sync_status, sync_attempts, last_synced_at, sync_error)
  VALUES (v_persona_camp2, v_user_enc, v_user_enc, true, 'synced', 0, now(), NULL)
  ON CONFLICT (id_campesinos) DO NOTHING;

  INSERT INTO operacional.formularios (id_formulario, titulo, version, estructura, activo, creado_por, created_at, update_at)
  VALUES (gen_random_uuid(), 'Formulario de prueba', 1, '{"secciones":[{"nombre":"Datos generales","preguntas":[{"id":"nombre","tipo":"texto","titulo":"Nombre"}]}]}', true, v_user_enc, now(), now())
  ON CONFLICT DO NOTHING;
END SEED_OK;