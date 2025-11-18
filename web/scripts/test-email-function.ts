import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testEmailFunction() {
  console.log('🔍 Testing get_all_user_emails RPC function...\n');

  const { data, error } = await supabase.rpc('get_all_user_emails');

  if (error) {
    console.error('❌ Error calling RPC function:', error);
    console.error('\nThe function may not exist yet.');
    console.error('Please apply migration: migrations/003_add_user_email_function.sql');
    return;
  }

  console.log('✅ Function works!');
  console.log(`Found ${data?.length || 0} users with emails:\n`);

  if (data) {
    data.forEach((user: any, index: number) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.user_id})`);
    });
  }
}

testEmailFunction();
