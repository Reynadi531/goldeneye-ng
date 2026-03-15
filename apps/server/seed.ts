import "dotenv/config";
import { db } from "@goldeneye-ng/db";
import { user, account } from "@goldeneye-ng/db/schema/auth";
import { hashPassword } from "better-auth/crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@goldeneye.io";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123456";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";

async function seed() {
  console.log("🌱 Seeding admin user...");

  const existingUser = await db.query.user.findFirst({
    where: (users, { eq }) => eq(users.email, ADMIN_EMAIL),
  });

  if (existingUser) {
    console.log("⚠️  Admin user already exists");
    console.log("   To update password, delete the user manually or update via database");
    return;
  }

  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();

  const hashedPassword = await hashPassword(ADMIN_PASSWORD);

  await db.insert(user).values({
    id: userId,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    emailVerified: true,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(account).values({
    id: accountId,
    accountId: accountId,
    providerId: "credential",
    userId: userId,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("✅ Admin user created successfully!");
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role: admin`);
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
