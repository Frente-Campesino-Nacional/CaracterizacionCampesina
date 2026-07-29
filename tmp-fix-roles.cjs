const { PrismaClient, Prisma } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const groups = await tx.$queryRaw(Prisma.sql`
        SELECT LOWER(tip_rol) AS role_key, ARRAY_AGG(id_rol ORDER BY id_rol) AS ids
        FROM seguridad.roles
        GROUP BY LOWER(tip_rol)
        HAVING COUNT(*) > 1
      `);

      const updates = [];
      const deletes = [];

      for (const g of groups) {
        const ids = g.ids || [];
        const keepId = ids[0];
        const dropIds = ids.slice(1);
        if (!dropIds.length) continue;

        const updated = await tx.$executeRaw(Prisma.sql`
          UPDATE seguridad.usuarios
          SET id_rol = ${keepId}
          WHERE id_rol = ANY(${dropIds}::int[])
        `);

        const deleted = await tx.$executeRaw(Prisma.sql`
          DELETE FROM seguridad.roles
          WHERE id_rol = ANY(${dropIds}::int[])
        `);

        updates.push({ roleKey: g.role_key, keepId, dropIds, usersReassigned: updated });
        deletes.push({ roleKey: g.role_key, deletedRoles: deleted });
      }

      const finalRoles = await tx.$queryRaw(Prisma.sql`SELECT id_rol, tip_rol, des_rol FROM seguridad.roles ORDER BY id_rol`);
      const usage = await tx.$queryRaw(Prisma.sql`
        SELECT r.id_rol, r.tip_rol, COUNT(u.*)::int AS users_count
        FROM seguridad.roles r
        LEFT JOIN seguridad.usuarios u ON u.id_rol = r.id_rol
        GROUP BY r.id_rol, r.tip_rol
        ORDER BY r.id_rol
      `);

      return { updates, deletes, finalRoles, usage };
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
