const { PrismaClient, Prisma } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const id = '8f68ce64-8e40-48d4-baf2-8ac9c6691019';
    const rows = await prisma.$queryRaw(Prisma.sql`SELECT id_fotos, persona_id FROM operacional.fotos_perfil WHERE persona_id = ${id} LIMIT 1`);
    console.log('ROWS', JSON.stringify(rows));
  } catch (e) {
    console.error('ERR', e);
  } finally {
    await prisma.$disconnect();
  }
})();
