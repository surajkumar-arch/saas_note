const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  await prisma.note.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const acme = await prisma.tenant.create({ data: { slug: 'acme', name: 'Acme', plan: 'free' }});
  const globex = await prisma.tenant.create({ data: { slug: 'globex', name: 'Globex', plan: 'free' }});

  const p = await bcrypt.hash('password', 8);

  await prisma.user.createMany({
    data: [
      { email: 'admin@acme.test', passwordHash: p, role: 'admin', tenantId: acme.id },
      { email: 'user@acme.test', passwordHash: p, role: 'member', tenantId: acme.id },
      { email: 'admin@globex.test', passwordHash: p, role: 'admin', tenantId: globex.id },
      { email: 'user@globex.test', passwordHash: p, role: 'member', tenantId: globex.id }
    ]
  });

  console.log('Seeded tenants and users');
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });