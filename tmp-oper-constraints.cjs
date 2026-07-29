const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    for (const table of ['campesinos','formularios']) {
      const rows = await prisma.$queryRaw`SELECT conname, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid WHERE n.nspname = 'operacional' AND t.relname = ${table} ORDER BY conname`;
      console.log('TABLE', table);
      console.log(JSON.stringify(rows, null, 2));
    }
  } catch (error) {
    console.error(error.message || error);
  } finally {
    await prisma.$disconnect();
  }
})();
