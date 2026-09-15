

## 1. How would you model the relationship between School, User, and Referral?

```prisma
model School {
  id    String @id @default(cuid())
  users User[]
}

model User {
  id           String  @id @default(cuid())
  schoolId     String
  referredById String?

  school     School @relation(fields: [schoolId], references: [id])
  referredBy User?  @relation("Ref", fields: [referredById], references: [id])
  referrals  User[] @relation("Ref")
}

model Referral {
  id         String @id @default(cuid())
  schoolId   String
  referrerId String
  referredId String
}
```

- `schoolId` on `User` → multi-tenant link (which school a user belongs to).
- `referredById` on `User` → self-relation that forms the referral tree (each user points to their referrer).
- `Referral` → immutable audit log of each referral event (who referred whom, when). Not used for tree traversal.

## 2. How would you prevent cross-school referrals?

```ts
const referrer = await prisma.user.findFirst({
  where: {
    referralCode: data.referredByCode,
    schoolId,
  },
});
if (!referrer) throw new AppError("Invalid referrer for this school", 400);
```

If the code belongs to another school, `schoolId` won't match the lookup returns nothing and the request is rejected.

## 3. How would you retrieve 5+ levels efficiently?

```ts
const tree = await prisma.$queryRaw`
  WITH RECURSIVE tree AS (
    SELECT * FROM "User" WHERE id = ${rootId}
    UNION ALL
    SELECT u.* FROM "User" u
    JOIN tree t ON u."referredById" = t.id
  )
  SELECT * FROM tree;
`;
```

One round trip, indexed, scales far better than fetching level-by-level or recursing in JS.

## 4. Which indexes would you add?

```prisma
@@index([schoolId, referredById])
@@index([schoolId, deletedAt])
```

indexes match the actual query shape (every tree/stats query filters by both fields together), so they're faster than separate single-column indexes.

## 5.How would you handle a school with 100,000+ users?

- Don't load the whole tree into memory at once:
  ```ts
  const children = await prisma.user.findMany({
    where: { schoolId, referredById: parentId },
  });
  ```
- Cache results (e.g. Redis) :
  ```ts
  await redis.set(`tree:${schoolId}:${parentId}`, JSON.stringify(children));
  ```
- Paginate large children lists; avoid `SELECT *`.

## 6. How would you prevent unauthorized access to another school's referral tree?

Apply the auth middleware
and check the `schoolId` in the URL also caller's own school from their session/token and compare:

```ts
export async function GET(req, { params }) {
  const session = await getSession(req);
  const { schoolId } = await params;

  if (session.schoolId !== schoolId) {
    return new Response("Forbidden", { status: 403 });
  }

  return handleGetTree(req, schoolId);
}
```