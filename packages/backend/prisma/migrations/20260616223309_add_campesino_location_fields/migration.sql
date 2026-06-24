-- CreateTable
CREATE TABLE "consejos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "encargado_tipo" TEXT NOT NULL,
    "encargado_id" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consejos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "cedula" TEXT,
    "rol" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "numero_telefono" TEXT,
    "fecha_nacimiento" TIMESTAMP(3),
    "genero" TEXT,
    "estado" TEXT,
    "municipio" TEXT,
    "direccion" TEXT,
    "consejo_id" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campesinos" (
    "id" SERIAL NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "fecha_nacimiento" TIMESTAMP(3),
    "genero" TEXT,
    "estado" TEXT,
    "municipio" TEXT,
    "direccion" TEXT,
    "consejo_id" INTEGER,
    "creado_por" INTEGER,
    "asignado_a" INTEGER,
    "tiene_pendientes" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campesinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formularios" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "estructura" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formularios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sincronizaciones" (
    "id" SERIAL NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" INTEGER NOT NULL,
    "operacion" TEXT NOT NULL,
    "datos" JSONB NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procesado_en" TIMESTAMP(3),

    CONSTRAINT "sincronizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consejos_nombre_key" ON "consejos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cedula_key" ON "usuarios"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "campesinos_cedula_key" ON "campesinos"("cedula");

-- AddColumns
ALTER TABLE "campesinos"
    ADD "telefono" TEXT,
    ADD "correo" TEXT;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_consejo_id_fkey" FOREIGN KEY ("consejo_id") REFERENCES "consejos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campesinos" ADD CONSTRAINT "campesinos_consejo_id_fkey" FOREIGN KEY ("consejo_id") REFERENCES "consejos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campesinos" ADD CONSTRAINT "campesinos_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campesinos" ADD CONSTRAINT "campesinos_asignado_a_fkey" FOREIGN KEY ("asignado_a") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formularios" ADD CONSTRAINT "formularios_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
