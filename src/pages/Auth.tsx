import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Brain, Eye, EyeOff, Sparkles, Stars } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Clear any invalid auth state when landing on auth page
    const checkAndClearInvalidAuth = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) {
          console.log('Clearing invalid session on auth page');
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.log('Clearing session due to error');
        await supabase.auth.signOut();
      }
    };
    
    checkAndClearInvalidAuth();
  }, []);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback#`,
      },
    });

    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: error.message,
      });
    } else if (data?.user?.identities?.length === 0) {
      toast({
        variant: "destructive",
        title: "Account exists",
        description: "An account with this email already exists. Please sign in instead.",
      });
    } else {
      toast({
        title: "Verification email sent",
        description: "Please check your email to verify your account before signing in.",
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast({
            variant: "destructive",
            title: "Email not verified",
            description: "Please check your email and verify your account before signing in.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Sign in failed",
            description: error.message,
          });
        }
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex">
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back to home</span>
        </Button>
      </div>
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      {/* Left side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-500 to-blue-500 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/nexon-logo.svg"
            alt="Nexon AI logo"
            className="w-12 h-12"
          />
          <h1 className="text-2xl font-bold text-white">Nexon AI</h1>
        </div>
        <div>
          <h2 className="text-5xl font-bold text-white mb-6">
            Transform Your Study Materials Into Interactive Learning
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Upload PDFs, videos, or links and let AI create personalized quizzes and flashcards. Study smarter with spaced repetition and track your progress.
          </p>
          <div className="grid grid-cols-2 gap-4 text-white/90">
            <div className="flex items-center gap-2">
              <Stars className="w-5 h-5 text-white" />
              <span>AI-Powered Generation</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <span>Spaced Repetition</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-white" />
              <span>Progress Tracking</span>
            </div>
          </div>
        </div>
        <div className="text-sm text-white/60">
          © 2025 Nexon AI. All rights reserved.
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">{isLogin ? "Login" : "Sign Up"}</h2>
            <p className="text-muted-foreground">
              {isLogin
                ? "Welcome back! Please enter your details."
                : "Create an account to get started."}
            </p>
          </div>

          <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  className="h-12"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading
                ? isLogin ? "Signing in..." : "Creating account..."
                : isLogin ? "Login" : "Sign Up"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "Sign up" : "Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
