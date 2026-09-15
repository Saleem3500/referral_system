/**
 * seed.ts
 *
 * Usage: npm run seed
 *
 * Creates a sample school with a referral tree:
 *
 * Green Valley School
 * └── Ahmed  (root)
 *     ├── Ali
 *     │   ├── Sara
 *     │   └── Hamza
 *     └── Usman
 *         └── Zain
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(" Seeding database...\n");

  // Create school
  const school = await prisma.school.create({
    data: { name: "Green Valley School" },
  });
  console.log(` School: ${school.name} (${school.id})`);

  // Helper to create a user
  async function createUser(
    name: string,
    email: string,
    referralCode: string,
    referredById: string | null
  ) {
    return prisma.user.create({
      data: { name, email, schoolId: school.id, referralCode, referredById },
    });
  }

  // Helper to create referral audit record
  async function createReferral(referrerId: string, referredId: string) {
    return prisma.referral.create({
      data: { schoolId: school.id, referrerId, referredId },
    });
  }

  // Seed users
  const ahmed = await createUser("Ahmed", "ahmed@gvs.com", "AHMED-001", null);
  console.log(`✅ User: Ahmed (root)`);

  const ali = await createUser("Ali", "ali@gvs.com", "ALI-002", ahmed.id);
  await createReferral(ahmed.id, ali.id);
  console.log(`✅ User: Ali  (referred by Ahmed)`);

  const usman = await createUser("Usman", "usman@gvs.com", "USMAN-003", ahmed.id);
  await createReferral(ahmed.id, usman.id);
  console.log(`✅ User: Usman  (referred by Ahmed)`);

  const sara = await createUser("Sara", "sara@gvs.com", "SARA-004", ali.id);
  await createReferral(ali.id, sara.id);
  console.log(`✅ User: Sara  (referred by Ali)`);

  const hamza = await createUser("Hamza", "hamza@gvs.com", "HAMZA-005", ali.id);
  await createReferral(ali.id, hamza.id);
  console.log(`✅ User: Hamza  (referred by Ali)`);

  const zain = await createUser("Zain", "zain@gvs.com", "ZAIN-006", usman.id);
  await createReferral(usman.id, zain.id);
  console.log(`✅ User: Zain  (referred by Usman)`);

  console.log(`
 Seed complete!

School ID: ${school.id}

Tree:
${school.name}
└── Ahmed
    ├── Ali
    │   ├── Sara
    │   └── Hamza
    └── Usman
        └── Zain

Test endpoints:
  POST  /api/schools/${school.id}/referrals
  GET   /api/schools/${school.id}/referrals/tree?depth=3
  GET   /api/schools/${school.id}/referrals/stats
`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
