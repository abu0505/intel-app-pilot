import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      toast({
        variant: "destructive",
        title: "Invalid Link",
        description: "The password reset link is invalid or has expired.",
      });
      navigate("/auth");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams, navigate, toast]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        variant: "destructive",
        title: "Invalid Token",
        description: "The reset token is missing.",
      });
      return;
    }

    // Validate password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: passwordError,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match.",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { token, newPassword },
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "Your password has been reset. You can now login with your new password.",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message || "Failed to reset password. The link may have expired.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"];
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

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
            Create New Password
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Choose a strong password to secure your account and protect your learning data.
          </p>
        </div>
        <div className="text-sm text-white/60">
          © 2025 Nexon AI. All rights reserved.
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {!success ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Reset Password</h2>
                <p className="text-muted-foreground">
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="h-12 pl-10 pr-12"
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
                  
                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, index) => (
                          <div
                            key={index}
                            className={`h-1 flex-1 rounded-full ${
                              index < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Password strength: <span className="font-medium">{strengthLabels[passwordStrength - 1] || "Very Weak"}</span>
                      </p>
                    </div>
                  )}
                  
                  <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                    <li className="flex items-center gap-2">
                      <div className={`w-1 h-1 rounded-full ${newPassword.length >= 8 ? "bg-green-500" : "bg-gray-400"}`} />
                      At least 8 characters
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-1 h-1 rounded-full ${/[A-Z]/.test(newPassword) ? "bg-green-500" : "bg-gray-400"}`} />
                      One uppercase letter
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-1 h-1 rounded-full ${/[a-z]/.test(newPassword) ? "bg-green-500" : "bg-gray-400"}`} />
                      One lowercase letter
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-1 h-1 rounded-full ${/[0-9]/.test(newPassword) ? "bg-green-500" : "bg-gray-400"}`} />
                      One number
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-12 pl-10 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? "Resetting Password..." : "Reset Password"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Password Reset Successful!</h2>
                <p className="text-muted-foreground">
                  Your password has been changed successfully. Redirecting to login...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
