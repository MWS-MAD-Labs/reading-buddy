require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434'),
  database: process.env.DB_NAME || 'reading_buddy',
  user: process.env.DB_USER || 'reading_buddy',
  password: process.env.DB_PASSWORD
});

async function createProfile() {
  try {
    const result = await pool.query(`
      INSERT INTO profiles (id, user_id, email, full_name, role, created_at, updated_at) 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW()) 
      ON CONFLICT (user_id) DO UPDATE SET role = $4
      RETURNING id, user_id, email, role
    `, ['afb3671b-ab8a-4e51-8688-e3c7c965971a', 'admin@test.com', 'Admin User', 'ADMIN']);
    
    console.log('Profile created/updated:');
    console.table(result.rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createProfile();
