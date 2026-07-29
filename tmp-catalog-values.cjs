const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const enumRows = await prisma.$queryRaw`SELECT e.enumlabel AS label FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'registros' AND t.typname = 'tipo_cedula_enum' ORDER BY e.enumsortorder`;
    const parroquias = await prisma.$queryRaw`SELECT id_parroquia FROM catalogos.parroquias ORDER BY id_parroquia LIMIT 5`;
    const generos = await prisma.$queryRaw`SELECT id_genero FROM catalogos.generos ORDER BY id_genero LIMIT 5`;
    console.log(JSON.stringify({ enumRows, parroquias, generos }, null, 2));
  } catch (error) {
    console.error(error.message || error);
  } finally {
    await prisma.$disconnect();
  }
})();
