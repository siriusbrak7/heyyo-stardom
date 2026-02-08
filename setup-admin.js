// setup-admin.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'YOUR_SUPABASE_URL'; // Get from Supabase Dashboard
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY'; // Get from Supabase Dashboard > Settings > API

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdmin() {
  console.log('Setting up admin user...');
  
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@currystardom.com',
    password: 'AdminPassword123!',
    email_confirm: true,
    user_metadata: { is_admin: true }
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  console.log('Auth user created:', authData.user.email);

  // Add to admin_users table
  const { error: adminError } = await supabase
    .from('admin_users')
    .insert({
      user_id: authData.user.id,
      email: authData.user.email,
      permissions: ['full_access']
    });

  if (adminError) {
    console.error('Admin table error:', adminError);
    return;
  }

  console.log('✅ Admin user fully configured!');
  console.log('Email: admin@currystardom.com');
  console.log('Password: AdminPassword123!');
  console.log('\nAccess via: http://localhost:5173/admin');
}

setupAdmin();