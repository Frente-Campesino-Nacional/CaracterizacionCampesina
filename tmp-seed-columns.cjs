const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    for (const [schema, table] of [['operacional','consejos'], ['operacional','campesinos'], ['operacional','formularios'], ['respuestas','respuesta_form']]) {
      const rows = await prisma.$queryRaw`SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = ${table} ORDER BY ordinal_position`;
      console.log('TABLE', schema + '.' + table);
      console.log(JSON.stringify(rows, null, 2));
    }
  } catch (error) {
    console.error(error.message || error);
  } finally {
    await prisma.$disconnect();
  }
})();
