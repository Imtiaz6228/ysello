import { prisma } from "../lib/prisma.js";
import { Role } from "@prisma/client";

const email = process.argv[2]?.toLowerCase();
const requestedRole = (process.argv[3]?.toUpperCase() ?? "ADMIN") as Role;

if (!email) {
  console.error(
    "Usage: npm run set-role -- user@example.com ADMIN|MODERATOR|SUPER_ADMIN",
  );
  process.exit(1);
}

if (!Object.values(Role).includes(requestedRole)) {
  console.error(
    `Invalid role. Choose one of: ${Object.values(Role).join(", ")}`,
  );
  process.exit(1);
}

const user = await prisma.user.update({
  where: { email },
  data: {
    role: requestedRole,
    // Staff accounts must pass the verified-user guard protecting /api/admin.
    emailVerifiedAt: new Date(),
  },
});

console.log(`Set ${user.email} to ${requestedRole}.`);
await prisma.$disconnect();
