import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("request-password-reset", {
        body: { email },
      });

      if (error) {
        throw error;
      }

      setSubmitted(true);
      toast({
        title: "Reset Link Sent",
        description: "If an account exists with this email, you'll receive a password reset link shortly.",
      });

      // Log development link if available
      if (data?.dev_reset_link) {
        console.log("Development Reset Link:", data.dev_reset_link);
        toast({
          title: "Development Mode",
          description: "Check console for reset link (development only)",
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset link. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex">
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
            Reset Your Password
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        <div className="text-sm text-white/60">
          © 2025 Nexon AI. All rights reserved.
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Link 
            to="/auth" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Forgot Password?</h2>
            <p className="text-muted-foreground">
              No worries, we'll send you reset instructions.
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 pl-10"
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">Check Your Email</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    We've sent a reset link to {email}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-primary hover:underline font-medium"
                >
                  try again
                </button>
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/auth"
              className="text-sm text-primary hover:underline font-medium"
            >
              Remember your password? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
