import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { findSchoolById } from "@/services/school.service";
import { CreateReferralInput } from "@/dtos/referral.dto";
import { User } from "@/entities/user.entity";


interface TreeNode {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  createdAt: Date;
  children: TreeNode[];
}


async function getAncestorIds(userId: string, schoolId: string): Promise<Set<string>> {
  const ancestors = new Set<string>();
  let currentId: string | null = userId;

  while (currentId) {
    const user: { id: string; referredById: string | null } | null =
      await prisma.user.findFirst({
        where: { id: currentId, schoolId, deletedAt: null },
        select: { id: true, referredById: true },
      });

    if (!user || !user.referredById) break;
    if (ancestors.has(user.referredById)) break; 
    ancestors.add(user.referredById);
    currentId = user.referredById;
  }

  return ancestors;
}


function buildTree(
  users: (TreeNode & { referredById?: string | null })[],
  parentId: string | null,
  maxDepth?: number,
  currentDepth = 1
): TreeNode[] {
  if (maxDepth !== undefined && currentDepth > maxDepth) return [];

  return users
    .filter((u) => (u.referredById ?? null) === parentId)
    .map((u) => ({
      ...u,
      children: buildTree(users, u.id, maxDepth, currentDepth + 1),
    }));
}


export async function createReferral(schoolId: string, data: CreateReferralInput): Promise<User> {
  // 1. School must exist
  await findSchoolById(schoolId);

  let referrer = null;

  // 2. Resolve referrer if code provided — must belong to the same school
  if (data.referredByCode) {
    referrer = await prisma.user.findFirst({
      where: {
        referralCode: data.referredByCode,
        schoolId,
        deletedAt: null,
      },
    });

    if (!referrer) {
      throw new AppError(
        "Referrer not found in this school. Cross-school referrals are not allowed.",
        400
      );
    }
  }

  // 3. Cannot refer yourself
  if (referrer && referrer.email === data.email) {
    throw new AppError("A user cannot refer themselves", 400);
  }

  // 4. Email must not already be taken (active users only)
  const existingUser = await prisma.user.findFirst({
    where: { email: data.email, deletedAt: null },
  });

  if (existingUser) {
    throw new AppError("A user with this email already exists", 409);
  }

  // 5. Referral code must be unique
  const existingCode = await prisma.user.findFirst({
    where: { referralCode: data.referralCode, deletedAt: null },
  });

  if (existingCode) {
    throw new AppError("This referral code is already taken", 409);
  }

  // 6. Prevent circular referrals
  //    e.g. A → B → C, then C tries to refer A — A is already an ancestor of C.
  if (referrer) {
    const referrerAncestors = await getAncestorIds(referrer.id, schoolId);
    if (referrerAncestors.has(referrer.id)) {
      throw new AppError("Circular referral detected", 400);
    }
  }

  // 7. Create the new user
  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      schoolId,
      referralCode: data.referralCode,
      referredById: referrer?.id ?? null,
    },
  });

  // 8. Create the referral audit record
  if (referrer) {
    await prisma.referral.create({
      data: {
        schoolId,
        referrerId: referrer.id,
        referredId: newUser.id,
      },
    });
  }

  return newUser;
}

export async function getReferralTree(schoolId: string, depth?: number) {
  // Ensure school exists
  await findSchoolById(schoolId);

  // One flat query — fetch all active users in the school
  const users = await prisma.user.findMany({
    where: { schoolId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
      referredById: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Build tree in memory from root nodes (no referredById)
  const tree = buildTree(users as (TreeNode & { referredById?: string | null })[], null, depth);

  return tree;
}

export async function getReferralStats(schoolId: string) {
  // Ensure school exists
  await findSchoolById(schoolId);

  // One flat query
  const users = await prisma.user.findMany({
    where: { schoolId, deletedAt: null },
    select: {
      id: true,
      referredById: true,
    },
  });

  const totalUsers = users.length;
  const totalReferrals = users.filter((u) => u.referredById !== null).length;

  // BFS to count users per level
  // Level 1 = root users (no referrer), Level 2 = their direct children, etc.
  const byLevel: Record<number, number> = {};

  const childrenMap = new Map<string | null, string[]>();
  for (const u of users) {
    const parentId = u.referredById ?? null;
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(u.id);
  }

  // BFS from root
  let currentLevel = childrenMap.get(null) ?? [];
  let level = 1;

  while (currentLevel.length > 0) {
    byLevel[level] = currentLevel.length;
    const nextLevel: string[] = [];
    for (const id of currentLevel) {
      const children = childrenMap.get(id) ?? [];
      nextLevel.push(...children);
    }
    currentLevel = nextLevel;
    level++;
  }

  // Direct referrals = users at level 2 (referred by root-level users)
  const directReferrals = byLevel[2] ?? 0;

  return {
    totalUsers,
    totalReferrals,
    directReferrals,
    byLevel,
  };
}
