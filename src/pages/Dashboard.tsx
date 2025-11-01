import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Brain, Menu } from "lucide-react";
import ChatTab from "@/components/dashboard/ChatTab";
import StudioTab from "@/components/dashboard/StudioTab";
import { CollapsibleSidebar } from "@/components/dashboard/CollapsibleSidebar";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { useNotebook } from "@/contexts/NotebookContext";

interface DashboardProps {
  defaultView?: "chat" | "studio";
}

function DashboardContent({ defaultView }: DashboardProps) {
  const navigate = useNavigate();
  const { notebookId } = useParams<{ notebookId: string }>();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { currentView, setCurrentView } = useDashboard();
  const { currentNotebook, setCurrentNotebook } = useNotebook();

  useEffect(() => {
    if (defaultView) {
      setCurrentView(defaultView);
    }
  }, [defaultView, setCurrentView]);

  useEffect(() => {
    if (notebookId) {
      fetchNotebookDetails();
    } else {
      setCurrentNotebook(null);
    }
  }, [notebookId]);

  const fetchNotebookDetails = async () => {
    if (!notebookId) return;
    const { data, error } = await supabase
      .from("notebooks")
      .select("*")
      .eq("id", notebookId)
      .single();
    if (!error && data) {
      setCurrentNotebook(data);
    }
  };

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-background">
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
        className="md:hidden absolute top-4 left-4 z-50"
        onClick={toggleMobileSidebar}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Main Content Area - NO CONTAINER, NO MX-AUTO */}
      <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 h-full w-full overflow-hidden">
          {currentView === "chat" ? <ChatTab /> : <StudioTab />}
        </main>
      </div>
    </div>
  );
}

const Dashboard = ({ defaultView }: DashboardProps) => {
  return (
    <DashboardProvider>
      <DashboardContent defaultView={defaultView} />
    </DashboardProvider>
  );
};

export default Dashboard;
