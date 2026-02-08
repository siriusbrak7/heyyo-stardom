import React, { useState } from "react";
import { X, Mail, Lock, User as UserIcon, AlertCircle } from "lucide-react";
import { signIn } from "../services/authService";
import { supabase } from "../supabase";

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
  defaultMode?: "login" | "signup";
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuthSuccess, defaultMode = "login" }) => {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const result = await signIn(email.trim(), password.trim());
        if (result.error) {
          setError(result.error.message || "Login failed");
          return;
        }
        if (result.data?.user) {
          onAuthSuccess(result.data.user);
          onClose();
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
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

        if (signUpError) {
          if (signUpError.message.includes('already registered') || signUpError.message.includes('Email not confirmed')) {
            const loginResult = await signIn(email.trim(), password.trim());
            if (loginResult.error) {
              setError(loginResult.error.message || "Account exists but login failed");
              return;
            }
            if (loginResult.data?.user) {
              onAuthSuccess(loginResult.data.user);
              onClose();
            }
            return;
          }
          setError(signUpError.message);
          return;
        }

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: data.user.email,
              plan_tier: 'Basic',
              subscription_status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (profileError && !profileError.message.includes('duplicate key')) {
            console.error('Profile creation warning:', profileError);
          }
          
          onAuthSuccess(data.user);
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[2000] flex items-center justify-center p-4">
      <div className="glass rounded-3xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-yellow-500" />
          </div>
          <h2 className="text-3xl font-black mb-2">
            {mode === "login" ? "Welcome Back" : "Join Curry Stardom"}
          </h2>
          <p className="text-gray-500">
            {mode === "login" 
              ? "Sign in to access your beats and dashboard" 
              : "Create your account to start downloading"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 disabled:opacity-50"
              placeholder="producer@example.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 disabled:opacity-50"
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 disabled:opacity-50"
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 text-black font-black py-4 rounded-xl hover:bg-yellow-400 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              mode === "login" ? "Sign In" : "Create Account"
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              disabled={loading}
              className="text-yellow-500 font-bold ml-2 hover:underline disabled:opacity-50"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
          <p className="text-xs text-gray-600 mt-4">
            By continuing, you agree to our Terms and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;