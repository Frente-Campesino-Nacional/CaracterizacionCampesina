BEGIN;

-- Demo users
INSERT INTO usuarios (
  id, email, password_hash, cedula, rol, nombre, apellido, numero_telefono,
  fecha_nacimiento, genero, estado, municipio, direccion, consejo_id, activo,
  creado_en, actualizado_en
) VALUES
(
  1,
  'ana.rojas@producir.local',
  '$2a$10$JhKEIn9naQEa4Gsuk3/Lk.sW3iCkXZN.VGj6hNDPbuvKiu7zpgRz2',
  'V-101',
  'admin',
  'Ana Maria',
  'Rojas',
  '04140000001',
  '1984-02-14T00:00:00.000Z',
  'Femenino',
  'Distrito Capital',
  'Libertador',
  'Av. Sucre, Edif. Producir',
  NULL,
  TRUE,
  NOW(),
  NOW()
),
(
  2,
  'carlos.perez@producir.local',
  '$2a$10$JhKEIn9naQEa4Gsuk3/Lk.sW3iCkXZN.VGj6hNDPbuvKiu7zpgRz2',
  'V-102',
  'admin',
  'Carlos Alberto',
  'Perez',
  '04140000002',
  '1980-09-20T00:00:00.000Z',
  'Masculino',
  'Lara',
  'Iribarren',
  'Calle 12, Sector Centro',
  NULL,
  TRUE,
  NOW(),
  NOW()
),
(
  3,
  'maria.suarez@producir.local',
  '$2a$10$zjG1dvmqaguNYbpWTf5OseWpzEWNNXnOG5bul4wl8/3hIOZQsEGXK',
  'V-103',
  'encuestador',
  'Maria Fernanda',
  'Suarez',
  '04140000003',
  '1991-06-08T00:00:00.000Z',
  'Femenino',
  'Miranda',
  'Chacao',
  'Urbanizacion La Floresta',
  NULL,
  TRUE,
  NOW(),
  NOW()
),
(
  4,
  'jose.herrera@producir.local',
  '$2a$10$zjG1dvmqaguNYbpWTf5OseWpzEWNNXnOG5bul4wl8/3hIOZQsEGXK',
  'V-104',
  'encuestador',
  'Jose Luis',
  'Herrera',
  '04140000004',
  '1988-11-03T00:00:00.000Z',
  'Masculino',
  'Zulia',
  'Maracaibo',
  'Sector Santa Lucia',
  NULL,
  TRUE,
  NOW(),
  NOW()
);

-- Demo councils
INSERT INTO consejos (
  id, nombre, descripcion, estado, municipio, encargado_tipo, encargado_id,
  creado_en, actualizado_en
) VALUES
(
  1,
  'Consejo Comunal Semillas de Libertad',
  'Consejo urbano de referencia para la zona central de Caracas.',
  'Distrito Capital',
  'Libertador',
  'admin',
  1,
  NOW(),
  NOW()
),
(
  2,
  'Consejo Productivo Valle Verde',
  'Consejo productivo del eje agrícola de Lara.',
  'Lara',
  'Iribarren',
  'encuestador',
  3,
  NOW(),
  NOW()
),
(
  3,
  'Consejo Agroecologico Lago Azul',
  'Consejo agroecologico del occidente del pais.',
  'Zulia',
  'Maracaibo',
  'encuestador',
  4,
  NOW(),
  NOW()
);

UPDATE usuarios SET consejo_id = 1 WHERE id = 1;
UPDATE usuarios SET consejo_id = 2 WHERE id = 3;
UPDATE usuarios SET consejo_id = 3 WHERE id = 4;

-- Demo campesinos: 10 registros
-- Distribucion aplicada: 4 en el consejo 1, 2 en el consejo 2 y 4 en el consejo 3.
INSERT INTO campesinos (
  id, cedula, nombre, apellido, fecha_nacimiento, genero, estado, municipio,
  direccion, consejo_id, creado_por, asignado_a, tiene_pendientes, metadata,
  creado_en, actualizado_en
) VALUES
(
  1,
  'V-201',
  'Luis Antonio',
  'Mendez',
  '1979-01-15T00:00:00.000Z',
  'Masculino',
  'Distrito Capital',
  'Libertador',
  'Sector El Cementerio, calle principal',
  1,
  1,
  3,
  FALSE,
  '{"origen":"demo"}',
  NOW(),
  NOW()
),
(
  2,
  'V-202',
  'Rosa Elena',
  'Figueroa',
  '1986-04-22T00:00:00.000Z',
  'Femenino',
  'Distrito Capital',
  'Libertador',
  'Barrio San Juan, carrera 4',
  1,
  1,
  3,
  TRUE,
  '{"origen":"demo"}',
  NOW(),
  NOW()
),
(
  3,
  'V-203',
  'Pedro Jose',
  'Castillo',
  '1973-08-09T00:00:00.000Z',
  'Masculino',
  'Distrito Capital',
  'Libertador',
  'Urbanizacion Propatria',
  1,
  1,
  4,
  FALSE,
  '{"origen":"demo"}',
  NOW(),
  NOW()
),
(
  4,
  'V-204',
  'Marta Cecilia',
  'Reyes',
  '1990-12-30T00:00:00.000Z',
  'Femenino',
  'Distrito Capital',
  'Libertador',
  'Sector Catia, pasaje 8',
  1,
  1,
  4,
  FALSE,
  '{"origen":"demo"}',
  NOW(),
  NOW()
),
(
  5,
  'V-205',
  'Juan Miguel',
  'Torres',
  '1982-07-19T00:00:00.000Z',
  'Masculino',
  'Lara',
  'Iribarren',
  'Calle 19, zona oeste',
  2,
  3,
  3,
  TRUE,
  '{"origen":"demo"}',
  NOW(),
  NOW()
),
(
  6,
  'V-206',
  'Ana Karina',
  'Morales',
  '1995-05-11T00:00:00.000Z',
  'Femenino',
  'Lara',
  'Iribarren',
  'Barrio La Carucieña',
  2,
  3,
  3,
  FALSE,
  '{"origen":"demo"}',
  NOW(),
  NOW()
),
(
  7,
  'V-207',
  'Jose Rafael',
  'Rojas',
  '1978-03-27T00:00:00.000Z',
  'Masculino',
  'Zulia',
  'Maracaibo',
  'Sector Patarata',
  3,
  4,
  4,
  TRUE,
  '{"origen":"demo"}',
  NOW(),
  NOW()
),
(
  8,
  'V-208',
  'Carolina Josefina',
  'Suarez',
  '1989-10-14T00:00:00.000Z',
  'Femenino',
  'Zulia',
  'Maracaibo',
  'Sector Sabaneta',
  3,
  4,
  4,
  FALSE,
  '{"origen":"demo"}',
  NOW(),
  NOW()
),
(
  9,
  'V-209',
  'Manuel Andres',
  'Pineda',
  '1971-09-02T00:00:00.000Z',
  'Masculino',
  'Zulia',
  'Maracaibo',
  'Av. La Limpia',
  3,
  4,
  4,
  TRUE,
  '{"origen":"demo"}',
  NOW(),
  NOW()
),
(
  10,
  'V-210',
  'Diana Lorena',
  'Gonzalez',
  '1993-01-25T00:00:00.000Z',
  'Femenino',
  'Zulia',
  'Maracaibo',
  'Sector Delicias Nuevas',
  3,
  4,
  4,
  FALSE,
  '{"origen":"demo"}',
  NOW(),
  NOW()
);

SELECT setval(pg_get_serial_sequence('usuarios', 'id'), (SELECT COALESCE(MAX(id), 1) FROM usuarios));
SELECT setval(pg_get_serial_sequence('consejos', 'id'), (SELECT COALESCE(MAX(id), 1) FROM consejos));
SELECT setval(pg_get_serial_sequence('campesinos', 'id'), (SELECT COALESCE(MAX(id), 1) FROM campesinos));

COMMIT;