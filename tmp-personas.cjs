const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const cols = await prisma.$queryRaw`SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_schema = 'registros' AND table_name = 'personas' ORDER BY ordinal_position`;
    console.log(JSON.stringify(cols, null, 2));
    const cons = await prisma.$queryRaw`SELECT conname, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid WHERE n.nspname = 'registros' AND t.relname = 'personas' ORDER BY conname`;
    console.log('CONSTRAINTS');
    console.log(JSON.stringify(cons, null, 2));
  } catch (error) {
    console.error(error.message || error);
  } finally {
    await prisma.$disconnect();
  }
})();
