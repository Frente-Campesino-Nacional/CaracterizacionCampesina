const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    for (const table of ['consejos','campesinos','formularios','respuesta_form']) {
      const rows = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'operacional' AND table_name = ${table} ORDER BY ordinal_position`;
      console.log('TABLE', table);
      console.log(JSON.stringify(rows, null, 2));
    }
  } catch (error) {
    console.error(error.message || error);
  } finally {
    await prisma.$disconnect();
  }
})();
