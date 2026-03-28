import pkg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedNewRoles() {
  const client = await pool.connect();
  try {
    const users = [
      { username: "morgan", email: "morgan@secops.local", password: "Manager@1234!",  role: "soc_manager",        displayName: "Morgan Lee" },
      { username: "elena",  email: "elena@secops.local",  password: "Engineer@1234!", role: "detection_engineer", displayName: "Elena Ramos" },
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      await client.query(
        `INSERT INTO users (id, username, email, password_hash, role, display_name, status, failed_login_attempts, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'active', 0, NOW(), NOW())
         ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, display_name = EXCLUDED.display_name`,
        [u.username, u.email, hash, u.role, u.displayName]
      );
      console.log(`✓ Upserted: ${u.username} (${u.role}) — password: ${u.password}`);
    }

    console.log("\nNew role users ready!");
  } finally {
    client.release();
    await pool.end();
  }
}

seedNewRoles().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
