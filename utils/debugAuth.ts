// Create utils/debugAuth.ts
export const debugAuth = async () => {
  console.log('=== AUTH DEBUG ===');
  
  // 1. Check localStorage
  const storage = { ...localStorage };
  console.log('LocalStorage:', Object.keys(storage)
    .filter(key => key.includes('supabase') || key.includes('auth'))
    .reduce((obj, key) => ({ ...obj, [key]: storage[key] }), {}));
  
  // 2. Check current session
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session:', session?.user?.email);
  
  // 3. Check current user
  const { data: { user } } = await supabase.auth.getUser();
  console.log('User:', user?.email);
  
  // 4. Test sign in
  console.log('Testing sign in...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'Test123!'
    });
    console.log('Sign in result:', { data: data?.user?.email, error });
  } catch (err) {
    console.error('Sign in error:', err);
  }
  
  console.log('=== END DEBUG ===');
};

// Add to your App.tsx temporarily:
useEffect(() => {
  // Debug on load
  debugAuth();
}, []);