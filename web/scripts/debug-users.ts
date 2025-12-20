import { Pool } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function debugUsers() {
    const pool = new Pool({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5434"),
        database: process.env.DB_NAME || "reading_buddy",
        user: process.env.DB_USER || "reading_buddy",
        password: process.env.DB_PASSWORD,
    });

    try {
        const countRes = await pool.query("SELECT count(*) FROM profiles");
        console.log("Profile Count:", countRes.rows[0].count);

        const profilesRes = await pool.query("SELECT * FROM profiles"); // Select all to see roles
        console.log("Profiles:", profilesRes.rows);

        const usersRes = await pool.query("SELECT * FROM public.users");
        console.log("Public Users:", usersRes.rows);

        const authUsersRes = await pool.query("SELECT * FROM auth.users");
        console.log("Auth Users:", authUsersRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugUsers();
