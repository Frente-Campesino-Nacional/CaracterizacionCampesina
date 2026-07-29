const { PrismaClient, Prisma } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const roles = await prisma.$queryRaw(Prisma.sql`SELECT id_rol, tip_rol, des_rol FROM seguridad.roles ORDER BY tip_rol, id_rol`);
    const duplicates = await prisma.$queryRaw(Prisma.sql`
      SELECT tip_rol, COUNT(*)::int AS total, ARRAY_AGG(id_rol ORDER BY id_rol) AS ids
      FROM seguridad.roles
      GROUP BY tip_rol
      HAVING COUNT(*) > 1
      ORDER BY tip_rol
    `);
    const usage = await prisma.$queryRaw(Prisma.sql`
      SELECT u.id_rol, COUNT(*)::int AS users_count
      FROM seguridad.usuarios u
      GROUP BY u.id_rol
      ORDER BY u.id_rol
    `);
    console.log(JSON.stringify({ roles, duplicates, usage }, null, 2));
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
