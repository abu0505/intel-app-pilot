import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Brain, LogOut, Sparkles, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ChatTab from "@/components/dashboard/ChatTab";
import StudioTab from "@/components/dashboard/StudioTab";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary" />
          <span className="text-xl font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="studio" className="min-h-screen bg-background">
      <header className="border-b" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="container mx-auto px-4 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                StudyAI
                <Sparkles className="w-5 h-5 text-accent" />
              </h1>
              <p className="text-xs text-muted-foreground">Welcome back, {user?.user_metadata?.full_name || "Student"}!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/change-password")}>
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-4">
          <TabsList className="grid w-full max-w-md grid-cols-2 gap-2 rounded-xl border bg-muted/40 p-1">
            <TabsTrigger value="studio">Studio</TabsTrigger>
            <TabsTrigger value="chat">AI Chat</TabsTrigger>
          </TabsList>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <TabsContent value="studio">
          <StudioTab />
        </TabsContent>

        <TabsContent value="chat">
          <ChatTab />
        </TabsContent>
      </main>
    </Tabs>
  );
};

export default Dashboard;
