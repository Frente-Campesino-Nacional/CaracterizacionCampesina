const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const rows = await prisma.usuario.findMany({ take: 1 });
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error(error.message || error);
  } finally {
    await prisma.$disconnect();
  }
})();
