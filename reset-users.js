// reset-users.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xfnirkotcpclpbniudmp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // GET THIS FROM SETTINGS > API

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  console.log('Get it from: Supabase Dashboard → Settings → API → service_role');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    const { data: admin, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@currystardom.com',
      password: 'Admin123!',
      email_confirm: true, // Auto-confirm
      user_metadata: {
        is_super_admin: true,
        plan_tier: 'Exclusive'
      }
    });

    if (adminError) {
      console.error('Admin creation error:', adminError);
      return;
    }

    console.log('✅ Admin created:', admin.user.email);
    
    // Add to admin_users table
    const { error: adminTableError } = await supabaseAdmin
      .from('admin_users')
      .insert({
        user_id: admin.user.id,
        email: admin.user.email,
        is_super_admin: true,
        permissions: ['super_admin', 'manage_all'],
        last_login: new Date().toISOString()
      });

    if (adminTableError) {
      console.error('Admin table error:', adminTableError);
    } else {
      console.log('✅ Added to admin_users table');
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: admin.user.id,
        email: admin.user.email,
        plan_tier: 'Exclusive',
        subscription_status: 'active',
        download_count_this_month: 0,
        total_downloads: 0
      });

    if (profileError) {
      console.error('Profile error:', profileError);
    } else {
      console.log('✅ Profile created');
    }

    return admin.user;
  } catch (error) {
    console.error('Create admin error:', error);
  }
}

async function createTestUser() {
  try {
    console.log('\nCreating test user...');
    
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'producer@test.com',
      password: 'Test123!',
      email_confirm: true,
      user_metadata: {
        plan_tier: 'Basic'
      }
    });

    if (userError) {
      console.error('Test user error:', userError);
      return;
    }

    console.log('✅ Test user created:', user.user.email);
    
    // Create profile
    await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.user.id,
        email: user.user.email,
        plan_tier: 'Basic',
        subscription_status: 'active',
        download_count_this_month: 0,
        total_downloads: 0
      });

    console.log('✅ Test user profile created');
    
    return user.user;
  } catch (error) {
    console.error('Create test user error:', error);
  }
}

async function verifyUsers() {
  console.log('\nVerifying users...');
  
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) {
    console.error('List users error:', error);
    return;
  }

  console.log(`Total users: ${users.length}`);
  users.forEach(user => {
    console.log(`- ${user.email} (${user.id})`);
  });

  // Check profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*');
  
  console.log(`\nTotal profiles: ${profiles?.length || 0}`);
  profiles?.forEach(p => {
    console.log(`- ${p.email} (${p.plan_tier})`);
  });

  // Check admin users
  const { data: adminUsers } = await supabaseAdmin
    .from('admin_users')
    .select('*');
  
  console.log(`\nTotal admin users: ${adminUsers?.length || 0}`);
  adminUsers?.forEach(a => {
    console.log(`- ${a.email} (super admin: ${a.is_super_admin})`);
  });
}

async function main() {
  console.log('🚀 Starting user reset...\n');
  
  // Delete existing users first
  console.log('Deleting existing users...');
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  
  for (const user of users) {
    console.log(`Deleting: ${user.email}`);
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Create new users
  await createAdminUser();
  await createTestUser();
  
  // Verify
  await verifyUsers();
  
  console.log('\n🎉 RESET COMPLETE!');
  console.log('\n=== CREDENTIALS ===');
  console.log('ADMIN: admin@currystardom.com / Admin123!');
  console.log('TEST USER: producer@test.com / Test123!');
  console.log('\nLogin and test immediately!');
}

main().catch(console.error);