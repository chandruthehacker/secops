import { db, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  const existingAdmin = await db.select().from(usersTable).where(eq(usersTable.username, "admin")).limit(1);
  if (existingAdmin.length > 0) {
    console.log("Admin user already exists. Skipping.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("Admin@SecOps1!", 12);

  await db.insert(usersTable).values([
    {
      username: "admin",
      email: "admin@secops.local",
      passwordHash,
      role: "admin",
      displayName: "Admin User",
      status: "active",
    },
    {
      username: "alice",
      email: "alice@secops.local",
      passwordHash: await bcrypt.hash("Analyst@1234!", 12),
      role: "soc_l2",
      displayName: "Alice Analyst",
      status: "active",
    },
    {
      username: "bob",
      email: "bob@secops.local",
      passwordHash: await bcrypt.hash("Analyst@1234!", 12),
      role: "soc_l1",
      displayName: "Bob Chen",
      status: "active",
    },
    {
      username: "diana",
      email: "diana@secops.local",
      passwordHash: await bcrypt.hash("Analyst@1234!", 12),
      role: "soc_l2",
      displayName: "Diana Park",
      status: "active",
    },
    {
      username: "viewer",
      email: "viewer@secops.local",
      passwordHash: await bcrypt.hash("Viewer@1234!", 12),
      role: "viewer",
      displayName: "Audit Viewer",
      status: "active",
    },
  ]);

  console.log("✅ Seeded users:");
  console.log("  admin / Admin@SecOps1! (Admin)");
  console.log("  alice / Analyst@1234! (SOC L2)");
  console.log("  bob   / Analyst@1234! (SOC L1)");
  console.log("  diana / Analyst@1234! (SOC L2)");
  console.log("  viewer / Viewer@1234! (Viewer)");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
