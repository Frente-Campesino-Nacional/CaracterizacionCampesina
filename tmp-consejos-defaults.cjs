const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const rows = await prisma.$queryRaw`SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_schema = 'operacional' AND table_name = 'consejos' AND column_name IN ('consejo_id','uuid','nombre_consejo','encargado_id') ORDER BY ordinal_position`;
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error(error.message || error);
  } finally {
    await prisma.$disconnect();
  }
})();
