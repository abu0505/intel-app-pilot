import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotebookProvider } from "@/contexts/NotebookContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Notebooks from "./pages/Notebooks";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import { useAuth } from "./contexts/AuthContext";

const queryClient = new QueryClient();

// Redirect authenticated users away from auth page
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NotebookProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route 
                  path="/auth" 
                  element={
                    <AuthRoute>
                      <Auth />
                    </AuthRoute>
                  } 
                />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route 
                  path="/forgot-password" 
                  element={
                    <AuthRoute>
                      <ForgotPassword />
                    </AuthRoute>
                  } 
                />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/change-password"
                  element={
                    <ProtectedRoute>
                      <ChangePassword />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notebooks"
                  element={
                    <ProtectedRoute>
                      <Notebooks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/studio/:notebookId"
                  element={
                    <ProtectedRoute>
                      <Dashboard defaultView="studio" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat/:notebookId"
                  element={
                    <ProtectedRoute>
                      <Dashboard defaultView="chat" />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </NotebookProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
