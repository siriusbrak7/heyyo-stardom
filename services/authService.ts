import { supabase } from '../supabase';

export interface AuthResponse {
  data: any;
  error: Error | null;
}

export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });

    if (error) {
      console.error('Sign in error:', error.message);
      return { data: null, error };
    }

    console.log('Sign in successful for:', data.user?.email);
    
    // Ensure user profile exists
    if (data.user) {
      await ensureUserProfile(data.user);
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error('Sign in exception:', error);
    return { data: null, error };
  }
};

export const signUp = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          plan_tier: 'Basic',
          subscription_status: 'pending'
        }
      }
    });

    if (error) {
      console.error('Sign up error:', error.message);
      
      // If user exists but email not confirmed, try signing in
      if (error.message.includes('already registered') || error.message.includes('Email not confirmed')) {
        console.log('User may exist, trying sign in...');
        return await signIn(email, password);
      }
      
      return { data: null, error };
    }

    console.log('Sign up successful:', data.user?.email);
    
    // Create user profile
    if (data.user) {
      await ensureUserProfile(data.user);
      
      // Auto sign in after successful signup
      return await signIn(email, password);
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Sign up exception:', error);
    return { data: null, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

export const signOut = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Sign out exception:', error);
    return false;
  }
};

export const onAuthStateChange = (callback: (user: any) => void) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
  return data;
};

// Helper function to ensure user profile exists
const ensureUserProfile = async (user: any): Promise<boolean> => {
  try {
    // First check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    
    if (existingProfile) {
      console.log('Profile already exists, skipping creation');
      return true;
    }
    
    // Only create if doesn't exist
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        plan_tier: 'Basic',
        subscription_status: 'pending',
        download_count_this_month: 0,
        joined_at: new Date().toISOString()
      });
    
    if (error && !error.message.includes('duplicate key')) {
      console.warn('Profile creation warning:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Profile creation exception:', error);
    return false;
  }
};

// Password reset function
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      console.error('Password reset error:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Password reset exception:', error);
    return false;
  }
};

// Update user profile
export const updateUserProfile = async (userId: string, updates: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Update profile error:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Update profile exception:', error);
    return false;
  }
};