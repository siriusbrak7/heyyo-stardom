import { createClient } from '@supabase/supabase-js';

// Environment variables with fallbacks
const getEnvVar = (viteKey: string, nodeKey: string, fallback: string): string => {
  // Try Vite/import.meta.env first
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
    const value = import.meta.env[viteKey];
    if (value && typeof value === 'string') return value;
  }
  
  // Try process.env for Node.js/SSR
  if (typeof process !== 'undefined' && process.env && process.env[nodeKey]) {
    const value = process.env[nodeKey];
    if (value && typeof value === 'string') return value;
  }
  
  // Return fallback
  return fallback;
};

const supabaseUrl = getEnvVar(
  'VITE_SUPABASE_URL',
  'SUPABASE_URL',
  'https://your-project.supabase.co'
);

const supabaseAnonKey = getEnvVar(
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'your-anon-key-here'
);

// Validate environment variables
const validateConfig = (url: string, key: string): void => {
  if (url.includes('your-project') || key.includes('your-anon-key')) {
    console.warn('⚠️ Supabase is using default configuration. Please set environment variables:');
    console.warn('- VITE_SUPABASE_URL / SUPABASE_URL');
    console.warn('- VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY');
  }
  
  if (!url.startsWith('https://')) {
    console.error('❌ Supabase URL must start with https://');
  }
  
  if (key.length < 20) {
    console.warn('⚠️ Supabase key appears to be invalid or too short');
  }
};

validateConfig(supabaseUrl, supabaseAnonKey);

// Create Supabase client with configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'heyyo-stardom'
    }
  }
});

// Test connection on startup (optional)
export const testConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase connection test failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('Supabase connection test exception:', error);
    return false;
  }
};

// Optional: Run connection test in development
if (import.meta.env?.MODE === 'development') {
  testConnection();
}