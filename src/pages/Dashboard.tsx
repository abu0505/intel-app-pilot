import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Brain, Menu } from "lucide-react";
import ChatTab from "@/components/dashboard/ChatTab";
import StudioTab from "@/components/dashboard/StudioTab";
import { CollapsibleSidebar } from "@/components/dashboard/CollapsibleSidebar";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";

function DashboardContent() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { currentView } = useDashboard();

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

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
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
    <div className="min-h-screen bg-background flex">
      {/* Collapsible Sidebar */}
      <CollapsibleSidebar
        onSignOut={handleSignOut}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
      />

      {/* Mobile hamburger button - absolute positioning */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-40"
        onClick={toggleMobileSidebar}
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-6 overflow-auto">
          {currentView === "chat" ? <ChatTab /> : <StudioTab />}
        </main>
      </div>
    </div>
  );
}

const Dashboard = () => {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
};

export default Dashboard;
