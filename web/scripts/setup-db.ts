import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function setupDatabase() {
    console.log("🚀 Starting database setup...");

    const pool = new Pool({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5434"),
        database: process.env.DB_NAME || "reading_buddy",
        user: process.env.DB_USER || "reading_buddy",
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });

    try {
        // Read the SQL file
        const sqlPath = path.resolve(__dirname, "../../database-setup.sql");
        console.log(`📖 Reading SQL file from: ${sqlPath}`);

        if (!fs.existsSync(sqlPath)) {
            throw new Error("database-setup.sql not found!");
        }

        const sqlContent = fs.readFileSync(sqlPath, "utf8");

        // Connect to database
        console.log("🔌 Connecting to database...");
        const client = await pool.connect();

        try {
            console.log("⚡ Executing database setup script...");
            // Wrap in transaction
            await client.query("BEGIN");

            console.log("🧹 Wiping schemas for fresh install...");
            await client.query(`
                DROP SCHEMA IF EXISTS public CASCADE;
                DROP SCHEMA IF EXISTS auth CASCADE;
                CREATE SCHEMA public;
                GRANT ALL ON SCHEMA public TO "${process.env.DB_USER || "reading_buddy"}";
                GRANT ALL ON SCHEMA public TO public;
            `);

            console.log("🛠️  Setting up auth schema mock...");
            await client.query(`
                CREATE SCHEMA IF NOT EXISTS auth;
                CREATE TABLE IF NOT EXISTS auth.users (
                    id UUID PRIMARY KEY,
                    email TEXT UNIQUE,
                    encrypted_password TEXT,
                    email_confirmed_at TIMESTAMP WITH TIME ZONE,
                    raw_user_meta_data JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- Mock auth functions
                CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ 
                    SELECT COALESCE(
                        current_setting('request.jwt.claim.sub', true),
                        (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
                    )::uuid 
                $$;

                CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ 
                    SELECT COALESCE(
                        current_setting('request.jwt.claim.role', true),
                        (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
                        'anon'
                    )::text 
                $$;
            `);

            console.log("🎭 Setting up usage roles...");
            await client.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
                        CREATE ROLE authenticated NOLOGIN;
                    END IF;
                    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
                        CREATE ROLE anon NOLOGIN;
                    END IF;
                    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
                        CREATE ROLE service_role NOLOGIN;
                    END IF;
                END
                $$;
                
                GRANT USAGE ON SCHEMA public TO authenticated;
                GRANT USAGE ON SCHEMA public TO anon;
                GRANT USAGE ON SCHEMA public TO service_role;

                -- Create public.users table for NextAuth
                CREATE TABLE IF NOT EXISTS public.users (
                    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                    name TEXT,
                    email TEXT UNIQUE,
                    email_verified TIMESTAMP WITH TIME ZONE,
                    image TEXT,
                    password_hash TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- Trigger to sync public.users to auth.users for FK consistency
                CREATE OR REPLACE FUNCTION sync_user_to_auth() RETURNS TRIGGER AS $$ 
                BEGIN 
                    INSERT INTO auth.users (id, email) 
                    VALUES (NEW.id, NEW.email) 
                    ON CONFLICT (id) DO NOTHING; 
                    RETURN NEW; 
                END; 
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS sync_users ON public.users;
                CREATE TRIGGER sync_users 
                AFTER INSERT ON public.users 
                FOR EACH ROW 
                EXECUTE FUNCTION sync_user_to_auth();
            `);

            // Execute the SQL
            await client.query(sqlContent);

            // Remove interference from Supabase trigger
            await client.query("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;");

            // Function used by NextAuth to create/update profiles
            await client.query(`
                CREATE OR REPLACE FUNCTION create_or_update_profile(
                    _user_id UUID,
                    _email TEXT,
                    _full_name TEXT,
                    _role user_role
                )
                RETURNS VOID
                LANGUAGE plpgsql
                SECURITY DEFINER
                AS $$
                BEGIN
                    INSERT INTO public.profiles (id, user_id, full_name, role)
                    VALUES (_user_id, _user_id, _full_name, _role)
                    ON CONFLICT (user_id) DO UPDATE
                    SET 
                        full_name = EXCLUDED.full_name,
                        role = CASE 
                            WHEN profiles.role = 'ADMIN' THEN profiles.role -- Don't downgrade admins
                            ELSE EXCLUDED.role
                        END,
                        updated_at = NOW();
                END;
                $$;
            `);

            await client.query("COMMIT");
            console.log("✅ Database setup completed successfully!");

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("❌ Database setup failed:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupDatabase();
