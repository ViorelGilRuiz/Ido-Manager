import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.upsert({
    where: { slug: 'demo-wedding-studio' },
    update: {},
    create: { name: 'Demo Wedding Studio', slug: 'demo-wedding-studio' },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ido.local' },
    update: {},
    create: {
      email: 'admin@ido.local',
      passwordHash: '$2b$10$7Qn2v0E7MdD0lM0CFX5MZuM8NfREf8kODsPwhj/KgOMGNJUgIAQ9u',
      role: 'ADMIN' as any,
      businessId: business.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'viorelgilruiz@gmail.com' },
    update: {
      passwordHash: '$2b$10$iAB2VGMg8uG2T1vgqDjDzu9QNkeEMJt5jBIGf18raDxgw4yGMNHH6',
      role: 'ADMIN' as any,
      businessId: business.id,
    },
    create: {
      email: 'viorelgilruiz@gmail.com',
      passwordHash: '$2b$10$iAB2VGMg8uG2T1vgqDjDzu9QNkeEMJt5jBIGf18raDxgw4yGMNHH6',
      role: 'ADMIN' as any,
      businessId: business.id,
    },
  });

  const seeds = [
    { name: 'Checklist boda', type: 'CHECKLIST', description: 'Checklist pre, dia B y post' },
    { name: 'Timeline dia B', type: 'TIMELINE', description: 'Plan horario del dia de boda' },
    { name: 'Presupuesto boda', type: 'BUDGET', description: 'Categorias e importes' },
    { name: 'Lista invitados', type: 'GUEST_LIST', description: 'Nombre, mesa, alergias' },
    { name: 'Proveedores boda', type: 'VENDOR_LIST', description: 'Contacto, estado y pago' },
  ] as const;

  for (const template of seeds) {
    const schemaJson = {
      version: 1,
      sections: [{ title: template.name, fields: [{ key: 'item_1', label: 'Campo 1', type: 'text' }] }],
    };

    const existing = await prisma.template.findFirst({
      where: { businessId: business.id, type: template.type as any },
    });

    if (!existing) {
      await prisma.template.create({
        data: {
          businessId: business.id,
          type: template.type as any,
          name: template.name,
          description: template.description,
          schemaJson,
          createdBy: admin.id,
        },
      });
    } else {
      await prisma.template.update({
        where: { id: existing.id },
        data: { name: template.name, description: template.description, schemaJson },
      });
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
