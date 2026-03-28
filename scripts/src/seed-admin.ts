import pkg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    const existing = await client.query("SELECT id FROM users WHERE username = $1", ["admin"]);
    if (existing.rows.length > 0) {
      console.log("✓ Admin user already exists. Skipping seed.");
      return;
    }

    const users = [
      { username: "admin",   email: "admin@secops.local",   password: "Admin@SecOps1!",   role: "admin",              displayName: "Admin User" },
      { username: "morgan",  email: "morgan@secops.local",  password: "Manager@1234!",     role: "soc_manager",        displayName: "Morgan Lee" },
      { username: "elena",   email: "elena@secops.local",   password: "Engineer@1234!",    role: "detection_engineer", displayName: "Elena Ramos" },
      { username: "alice",   email: "alice@secops.local",   password: "Analyst@1234!",     role: "soc_l2",             displayName: "Alice Analyst" },
      { username: "bob",     email: "bob@secops.local",     password: "Analyst@1234!",     role: "soc_l1",             displayName: "Bob Chen" },
      { username: "diana",   email: "diana@secops.local",   password: "Analyst@1234!",     role: "soc_l2",             displayName: "Diana Park" },
      { username: "viewer",  email: "viewer@secops.local",  password: "Viewer@1234!",      role: "viewer",             displayName: "Audit Viewer" },
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      await client.query(
        `INSERT INTO users (id, username, email, password_hash, role, display_name, status, failed_login_attempts, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'active', 0, NOW(), NOW())
         ON CONFLICT (username) DO NOTHING`,
        [u.username, u.email, hash, u.role, u.displayName]
      );
      console.log(`✓ Seeded: ${u.username} (${u.role}) — password: ${u.password}`);
    }

    console.log("\nAll users seeded successfully!");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
