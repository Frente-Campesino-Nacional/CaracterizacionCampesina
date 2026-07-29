const { PrismaClient, Prisma } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function ensureUser(payload) {
  const response = await fetch('http://localhost:3008/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (response.ok) {
    return JSON.parse(text);
  }

  if (response.status !== 409) {
    throw new Error(`Register failed for ${payload.email}: ${response.status} ${text}`);
  }

  const loginResponse = await fetch('http://localhost:3008/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });

  const loginText = await loginResponse.text();
  if (!loginResponse.ok) {
    throw new Error(`Login failed for existing ${payload.email}: ${loginResponse.status} ${loginText}`);
  }

  return JSON.parse(loginText);
}

async function main() {
  const admin = await ensureUser({
    email: 'admin.demo@censo.com',
    password: 'password123',
    nombre: 'Admin',
    apellido: 'Demo',
    rol: 'admin',
  });

  const encuestador = await ensureUser({
    email: 'encuestador.demo@censo.com',
    password: 'password123',
    nombre: 'Encuestador',
    apellido: 'Demo',
    rol: 'encuestador',
  });

  const parroquiaRows = await prisma.$queryRaw(Prisma.sql`SELECT id_parroquia FROM catalogos.parroquias ORDER BY id_parroquia LIMIT 1`);
  const generoRows = await prisma.$queryRaw(Prisma.sql`SELECT id_genero FROM catalogos.generos ORDER BY id_genero LIMIT 1`);
  const parroquiaId = parroquiaRows[0]?.id_parroquia;
  const generoId = generoRows[0]?.id_genero;
  if (parroquiaId == null || generoId == null) {
    throw new Error('No hay catálogos base disponibles para seed demo');
  }

  const existingCouncil = await prisma.$queryRaw(Prisma.sql`
    SELECT consejo_id
    FROM operacional.consejos
    WHERE nombre_consejo = 'Consejo Demo Producir'
    LIMIT 1
  `);

  let consejoId = existingCouncil[0]?.consejo_id;
  if (!consejoId) {
    const consejoRows = await prisma.$queryRaw(Prisma.sql`
      INSERT INTO operacional.consejos (
        nombre_consejo,
        descripcion,
        parrroquia,
        direccion_csj,
        encargado_id
      ) VALUES (
        'Consejo Demo Producir',
        'Consejo de demostración para validación end-to-end',
        ${parroquiaId},
        'Dirección de prueba',
        CAST(${admin.user.id} AS uuid)
      )
      RETURNING consejo_id
    `);
    consejoId = consejoRows[0]?.consejo_id;
  } else {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE operacional.consejos
      SET
        descripcion = 'Consejo de demostración para validación end-to-end',
        parrroquia = ${parroquiaId},
        direccion_csj = 'Dirección de prueba',
        encargado_id = CAST(${admin.user.id} AS uuid),
        updated_at = CURRENT_TIMESTAMP
      WHERE consejo_id = CAST(${consejoId} AS uuid)
    `);
  }

  if (!consejoId) {
    throw new Error('No se pudo crear el consejo demo');
  }

  const campesinoSeeds = [
    { nombre: 'Juan', apellido: 'Pérez', cedula: '12345678', direccion: 'Sector Demo 1', email: null },
    { nombre: 'María', apellido: 'Gómez', cedula: '23456789', direccion: 'Sector Demo 2', email: null },
  ];

  const campesinoIds = [];
  for (const seed of campesinoSeeds) {
    const personaRows = await prisma.$queryRaw(Prisma.sql`
      INSERT INTO registros.personas (
        id_personas,
        nombre,
        apellido,
        tipo_cedula,
        cedula,
        fecha_nacimiento,
        parroquia,
        direccion_usuario,
        email,
        numero_telefonico,
        genero,
        consejo_id
      ) VALUES (
        gen_random_uuid(),
        ${seed.nombre},
        ${seed.apellido},
        'V',
        ${seed.cedula},
        ${new Date('1990-01-01T00:00:00.000Z')},
        ${parroquiaId},
        ${seed.direccion},
        ${seed.email},
        NULL,
        ${generoId},
        CAST(${consejoId} AS uuid)
      )
      ON CONFLICT (cedula) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        apellido = EXCLUDED.apellido,
        fecha_nacimiento = EXCLUDED.fecha_nacimiento,
        parroquia = EXCLUDED.parroquia,
        direccion_usuario = EXCLUDED.direccion_usuario,
        genero = EXCLUDED.genero,
        consejo_id = EXCLUDED.consejo_id
      RETURNING id_personas
    `);

    const campesinoId = personaRows[0]?.id_personas;
    if (!campesinoId) {
      throw new Error(`No se pudo crear la persona campesina ${seed.nombre}`);
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO operacional.campesinos (
        id_campesinos,
        creado_por,
        asignado_a,
        formularios_pendientes
      ) VALUES (
        '${campesinoId}'::uuid,
        '${admin.user.id}'::uuid,
        '${encuestador.user.id}'::uuid,
        false
      )`
    );

    campesinoIds.push(campesinoId);
  }

  const existingForm = await prisma.$queryRaw(Prisma.sql`
    SELECT id_formulario
    FROM operacional.formularios
    WHERE titulo = 'Formulario Demo General'
    LIMIT 1
  `);

  let formularioId = existingForm[0]?.id_formulario;
  const estructura = JSON.stringify({
    preguntas: [
      {
        id: 'nombre_predio',
        label: 'Nombre del predio',
        type: 'text',
        required: true,
      },
      {
        id: 'tiene_riego',
        label: 'Tiene sistema de riego',
        type: 'select',
        required: true,
        options: [
          { label: 'Sí', value: 'si' },
          { label: 'No', value: 'no' },
        ],
      },
    ],
  });

  if (!formularioId) {
    const formularioRows = await prisma.$queryRaw(Prisma.sql`
      INSERT INTO operacional.formularios (
        titulo,
        estructura,
        activo,
        creado_por
      ) VALUES (
        'Formulario Demo General',
        CAST(${estructura} AS jsonb),
        true,
        CAST(${admin.user.id} AS uuid)
      )
      RETURNING id_formulario
    `);
    formularioId = formularioRows[0]?.id_formulario;
  } else {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE operacional.formularios
      SET
        estructura = CAST(${estructura} AS jsonb),
        activo = true,
        creado_por = CAST(${admin.user.id} AS uuid),
        update_at = CURRENT_TIMESTAMP
      WHERE id_formulario = CAST(${formularioId} AS uuid)
    `);
  }

  if (!formularioId) {
    throw new Error('No se pudo crear el formulario demo');
  }

  console.log(JSON.stringify({
    admin: admin.user,
    encuestador: encuestador.user,
    consejoId,
    campesinoIds,
    formularioId,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
