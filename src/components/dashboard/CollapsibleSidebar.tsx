import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MessageSquare,
  Sparkles,
  Settings,
  LogOut,
  Pin,
  PinOff,
  User,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { useDashboard } from "@/contexts/DashboardContext";
import { useNavigate } from "react-router-dom";

interface ChatSession {
  session_id: string;
  created_at: string;
  first_message: string;
}

interface CollapsibleSidebarProps {
  onSignOut: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function CollapsibleSidebar({
  onSignOut,
  isMobileOpen = false,
  onMobileClose,
}: CollapsibleSidebarProps) {
  const navigate = useNavigate();
  const {
    isExpanded,
    isPinned,
    handleMouseEnter,
    handleMouseLeave,
    togglePin,
  } = useSidebarState();

  const { currentView, setCurrentView, sessionId, setSessionId, createNewSession } =
    useDashboard();

  // Fetch chat sessions
  const { data: chatSessions } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("chat_histories")
        .select("session_id, created_at, content")
        .eq("user_id", userData.user.id)
        .eq("message_type", "user")
        .gte("created_at", oneWeekAgo.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by session and get first message
      const sessionMap = new Map<string, ChatSession>();
      data.forEach((msg) => {
        if (!sessionMap.has(msg.session_id)) {
          sessionMap.set(msg.session_id, {
            session_id: msg.session_id,
            created_at: msg.created_at,
            first_message:
              msg.content.substring(0, 50) +
              (msg.content.length > 50 ? "..." : ""),
          });
        }
      });

      return Array.from(sessionMap.values());
    },
  });

  const handleNewChat = () => {
    createNewSession();
    if (onMobileClose) onMobileClose();
  };

  const handleChatClick = () => {
    setCurrentView("chat");
  };

  const handleStudioClick = () => {
    setCurrentView("studio");
    if (onMobileClose) onMobileClose();
  };

  const handleSessionClick = (session_id: string) => {
    setSessionId(session_id);
    setCurrentView("chat");
    if (onMobileClose) onMobileClose();
  };

  const sidebarWidth = isExpanded ? "280px" : "64px";
  const showLabels = isExpanded;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-border z-50",
          "flex flex-col transition-all duration-300 ease-in-out",
          "md:relative md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ width: sidebarWidth }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="Main navigation sidebar"
        aria-expanded={isExpanded}
      >
        {/* Top Section - Action buttons */}
        <div className="flex-1 flex flex-col py-4 px-2 space-y-2">
          {/* Mobile menu close button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mb-2"
            onClick={onMobileClose}
            aria-label="Close menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Pin button - only visible when expanded and on desktop */}
          {isExpanded && (
            <div className="hidden md:flex justify-end px-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePin}
                className="h-8 w-8"
                aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
              >
                {isPinned ? (
                  <PinOff className="w-4 h-4" />
                ) : (
                  <Pin className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          {/* New Chat button */}
          <Button
            variant="ghost"
            size={showLabels ? "default" : "icon"}
            className={cn(
              showLabels ? "justify-start" : "justify-center",
              !showLabels && "w-12 h-12"
            )}
            onClick={handleNewChat}
            aria-label="Create new chat"
          >
            <Plus className="w-5 h-5" />
            {showLabels && <span className="ml-2">New Chat</span>}
          </Button>

          {/* AI Chat button with hover expansion */}
          <div className="relative">
            <Button
              variant={currentView === "chat" ? "secondary" : "ghost"}
              size={showLabels ? "default" : "icon"}
              className={cn(
                "w-full",
                showLabels ? "justify-start" : "justify-center",
                !showLabels && "w-12 h-12"
              )}
              onClick={handleChatClick}
              aria-label="AI Chat"
              aria-current={currentView === "chat" ? "page" : undefined}
            >
              <MessageSquare className="w-5 h-5" />
              {showLabels && <span className="ml-2">AI Chat</span>}
            </Button>

            {/* Chat history dropdown - shown when expanded */}
            {isExpanded && currentView === "chat" && (
              <div className="mt-2 px-2">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground px-2 mb-2">
                      Recent Chats
                    </p>
                    {chatSessions?.map((session) => (
                      <button
                        key={session.session_id}
                        onClick={() => handleSessionClick(session.session_id)}
                        className={cn(
                          "w-full text-left p-2 rounded-md text-sm transition-colors",
                          "hover:bg-accent",
                          session.session_id === sessionId
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground"
                        )}
                        aria-current={
                          session.session_id === sessionId ? "true" : undefined
                        }
                      >
                        <p className="line-clamp-2 text-xs">
                          {session.first_message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(session.created_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                    {(!chatSessions || chatSessions.length === 0) && (
                      <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                        No recent chats
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Studio button */}
          <Button
            variant={currentView === "studio" ? "secondary" : "ghost"}
            size={showLabels ? "default" : "icon"}
            className={cn(
              showLabels ? "justify-start" : "justify-center",
              !showLabels && "w-12 h-12"
            )}
            onClick={handleStudioClick}
            aria-label="Studio - Upload sources"
            aria-current={currentView === "studio" ? "page" : undefined}
          >
            <Sparkles className="w-5 h-5" />
            {showLabels && <span className="ml-2">Studio</span>}
          </Button>
        </div>

        {/* Bottom Section - Theme & Account */}
        <div className="border-t border-border py-4 px-2 space-y-2">
          {/* Theme Toggle */}
          <div
            className={cn(
              "flex items-center",
              showLabels ? "justify-start px-2" : "justify-center"
            )}
          >
            <ThemeToggle />
            {showLabels && <span className="ml-2 text-sm">Theme</span>}
          </div>

          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size={showLabels ? "default" : "icon"}
                className={cn(
                  "w-full",
                  showLabels ? "justify-start" : "justify-center",
                  !showLabels && "w-12 h-12"
                )}
                aria-label="Account settings"
              >
                <User className="w-5 h-5" />
                {showLabels && <span className="ml-2">Account</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/change-password")}>
                <Settings className="w-4 h-4 mr-2" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
