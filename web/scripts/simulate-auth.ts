import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const authPool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5434"),
    database: process.env.DB_NAME || "reading_buddy",
    user: process.env.DB_USER || "reading_buddy",
    password: process.env.DB_PASSWORD,
});

async function simulateAuth() {
    try {
        console.log("--- Starting Auth Simulation ---");

        // 1. Initial State
        const initialProfiles = await authPool.query("SELECT COUNT(*) FROM profiles");
        console.log("Initial Profile Count:", initialProfiles.rows[0].count);

        // 2. Insert User (Mimic auth.ts)
        const email = `test_admin_${Date.now()}@test.com`;
        console.log(`Inserting user: ${email}`);

        const userRes = await authPool.query(
            "INSERT INTO users (email, name, email_verified, image) VALUES ($1, $2, NOW(), $3) RETURNING id",
            [email, "Test Admin", "http://image.com"]
        );
        const userId = userRes.rows[0].id;
        console.log(`User created with ID: ${userId}`);

        // 3. CHECK FOR INTERFERENCE (Trigger race?)
        // Sleep briefly to let async triggers fire if any
        await new Promise(r => setTimeout(r, 100));

        // Check if profile was magically created
        const profileCheck = await authPool.query("SELECT * FROM profiles WHERE id = $1", [userId]);
        if (profileCheck.rows.length > 0) {
            console.error("!!! INTERFERENCE DETECTED !!! Profile auto-created with role:", profileCheck.rows[0].role);
        } else {
            console.log("No auto-created profile found (GOOD).");
        }

        // 4. Check Profile Count (Mimic auth.ts logic)
        const profileCountRes = await authPool.query("SELECT COUNT(*) as count FROM profiles");
        const count = parseInt(profileCountRes.rows[0].count);
        console.log("Count for logic:", count);

        const isFirstUser = count === 0;
        console.log("isFirstUser:", isFirstUser);

        const role = isFirstUser ? "ADMIN" : "STUDENT";
        console.log("Calculated Role:", role);

        // 5. Create Profile (Mimic auth.ts)
        console.log("Calling create_or_update_profile...");
        await authPool.query(
            "SELECT create_or_update_profile($1, $2, $3, $4::user_role)",
            [userId, email, "Test Admin", role]
        );

        // 6. Final Verification
        const finalProfile = await authPool.query("SELECT * FROM profiles WHERE id = $1", [userId]);
        console.log("Final Profile Role:", finalProfile.rows[0]?.role);

    } catch (err) {
        console.error("Simulation Error:", err);
    } finally {
        await authPool.end();
    }
}

simulateAuth();
