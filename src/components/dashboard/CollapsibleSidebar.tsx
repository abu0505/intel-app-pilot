import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  Home,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { useDashboard } from "@/contexts/DashboardContext";
import { useNotebook } from "@/contexts/NotebookContext";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useFlashcards } from "@/hooks/use-flashcards";
import { useQuizzes } from "@/hooks/use-quizzes";
import { useEffect } from "react";

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
  const location = useLocation();
  const { notebookId } = useParams<{ notebookId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  const {
    isExpanded,
    isPinned,
    handleMouseEnter,
    handleMouseLeave,
    togglePin,
  } = useSidebarState();

  const { currentView, setCurrentView, sessionId, setSessionId, createNewSession } =
    useDashboard();
  
  const { currentNotebook, notebooks, fetchNotebooks, openNotebook } = useNotebook();
  const { flashcards } = useFlashcards(notebookId);
  const { quizzes } = useQuizzes(notebookId);

  const isInsideNotebook = !!notebookId;
  const isOnNotebooksPage = location.pathname === "/notebooks";

  useEffect(() => {
    if (isOnNotebooksPage) {
      fetchNotebooks();
    }
  }, [isOnNotebooksPage, fetchNotebooks]);

  // Invalidate flashcards and quizzes when switching notebooks
  useEffect(() => {
    if (notebookId) {
      queryClient.invalidateQueries({ queryKey: ["flashcards", notebookId] });
      queryClient.invalidateQueries({ queryKey: ["quizzes", notebookId] });
    }
  }, [notebookId, queryClient]);

  // Fetch chat sessions for current notebook
  const { data: chatSessions } = useQuery({
    queryKey: ["chat-sessions", notebookId],
    queryFn: async () => {
      if (!isInsideNotebook || !notebookId) return [];

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("chat_histories")
        .select("session_id, created_at, content")
        .eq("user_id", userData.user.id)
        .eq("notebook_id", notebookId)
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
    enabled: isInsideNotebook,
  });

  const handleNewChat = () => {
    createNewSession();
    if (onMobileClose) onMobileClose();
  };

  const handleHomeClick = () => {
    navigate("/notebooks");
    if (onMobileClose) onMobileClose();
  };

  const handleChatClick = () => {
    if (notebookId) {
      setCurrentView("chat");
      navigate(`/chat/${notebookId}`);
    }
  };

  const handleStudioClick = () => {
    if (notebookId) {
      setCurrentView("studio");
      navigate(`/studio/${notebookId}`);
    }
    if (onMobileClose) onMobileClose();
  };

  const handleSessionClick = (session_id: string) => {
    setSessionId(session_id);
    setCurrentView("chat");
    if (onMobileClose) onMobileClose();
  };

  const deleteChatMutation = useMutation({
    mutationFn: async (session_id: string) => {
      const { error } = await supabase
        .from("chat_histories")
        .delete()
        .eq("session_id", session_id)
        .eq("notebook_id", notebookId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions", notebookId] });
      toast({
        title: "Chat deleted",
        description: "The chat session has been removed.",
      });
      
      // If deleted session is current, create new one
      if (sessionToDelete === sessionId) {
        createNewSession();
      }
      
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    },
    onError: (error: Error) => {
      console.error("Delete chat error details:", {
        error: error.message,
        sessionId: sessionToDelete,
        notebookId,
        stack: error.stack
      });
      toast({
        variant: "destructive",
        title: "Failed to delete chat",
        description: error.message || "Please try again. If the issue persists, try refreshing the page.",
      });
    },
  });

  const handleDeleteChat = (session_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(session_id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteChat = () => {
    if (sessionToDelete) {
      deleteChatMutation.mutate(sessionToDelete);
    }
  };

  const sidebarWidth = isExpanded ? "280px" : "74px";

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
          "flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          "md:relative md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ width: sidebarWidth }}
        aria-label="Main navigation sidebar"
        aria-expanded={isExpanded}
      >
        {/* Mobile menu close button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden absolute top-4 right-4"
          onClick={onMobileClose}
          aria-label="Close menu"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Top Section - Logo */}
        <div className="flex flex-col items-center pt-6 pb-8 w-[74px] self-start">
          <div className="flex items-center justify-center">
            <img
              src="/nexon-logo.svg"
              alt="StudyAI"
              className="w-10 h-10"
            />
          </div>
        </div>

        {/* New Chat button - Only when inside notebook */}
        <div className="flex flex-col items-center justify-center pb-8 w-[74px] self-start">
          <button
            onClick={handleNewChat}
            className="flex flex-col items-center justify-center w-[60px] h-[60px] rounded-xl hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Create new chat"
            disabled={!isInsideNotebook}
          >
            <Plus className="w-5 h-5" />
            <span className="text-[11px] text-muted-foreground mt-1">New</span>
          </button>
        </div>

        {/* Middle Section - HOVERABLE ZONE - Icons + Chat History */}
        <div
          className="flex-1 flex overflow-hidden"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Left Column - Fixed Icons (always visible) */}
          <div className="flex flex-col items-center space-y-2 w-[74px] flex-shrink-0">
            {/* Home Icon - Always visible */}
            <button
              onClick={handleHomeClick}
              className={cn(
                "flex flex-col items-center justify-center w-[60px] h-[60px] rounded-xl transition-colors",
                isOnNotebooksPage
                  ? "bg-secondary/80 text-foreground"
                  : "hover:bg-secondary/50 text-muted-foreground"
              )}
              aria-label="Home"
              aria-current={isOnNotebooksPage ? "page" : undefined}
            >
              <Home className="w-5 h-5" />
              <span className="text-[11px] mt-1">Home</span>
            </button>

            {/* AI Chat Icon - Only visible inside notebook */}
            <button
              onClick={handleChatClick}
              className={cn(
                "flex flex-col items-center justify-center w-[60px] h-[60px] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                currentView === "chat" && isInsideNotebook
                  ? "bg-secondary/80 text-foreground"
                  : "hover:bg-secondary/50 text-muted-foreground"
              )}
              aria-label="AI Chat"
              aria-current={currentView === "chat" && isInsideNotebook ? "page" : undefined}
              disabled={!isInsideNotebook}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[11px] mt-1">Chat</span>
            </button>

            {/* Studio Icon - Only visible inside notebook */}
            <button
              onClick={handleStudioClick}
              className={cn(
                "flex flex-col items-center justify-center w-[60px] h-[60px] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                currentView === "studio" && isInsideNotebook
                  ? "bg-secondary/80 text-foreground"
                  : "hover:bg-secondary/50 text-muted-foreground"
              )}
              aria-label="Studio"
              aria-current={currentView === "studio" && isInsideNotebook ? "page" : undefined}
              disabled={!isInsideNotebook}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[11px] mt-1">Studio</span>
            </button>
          </div>

          {/* Right Panel - Current Notebook Name + Chat History (appears when expanded) */}
          {isExpanded && (
            <div className="flex-1 flex flex-col overflow-hidden pl-2 pr-3">
              {/* Current Notebook Display */}
              {isInsideNotebook && currentNotebook && (
                <div className="mb-4 px-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{currentNotebook.icon}</span>
                    <span className="text-sm font-medium truncate">{currentNotebook.name}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-3 px-2">
                <p className="text-sm text-muted-foreground font-medium">
                  {currentView === "chat" && isInsideNotebook
                    ? "Recent Chats"
                    : currentView === "studio" && isInsideNotebook
                    ? "Studio Content"
                    : isOnNotebooksPage
                    ? "Notebooks"
                    : "\u00A0"}
                </p>
                {(isInsideNotebook || isOnNotebooksPage) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={togglePin}
                    className="hidden md:inline-flex h-8 w-8"
                    aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
                  >
                    {isPinned ? (
                      <PinOff className="w-4 h-4" />
                    ) : (
                      <Pin className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>

              {/* Chat History List - Only when inside notebook and chat view */}
              {currentView === "chat" && isInsideNotebook && (
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-1">
                      {chatSessions?.map((session) => (
                        <div
                          key={session.session_id}
                          className={cn(
                            "group relative w-full rounded-lg transition-colors hover:bg-secondary/50",
                            session.session_id === sessionId ? "bg-secondary/80" : ""
                          )}
                        >
                          <button
                            onClick={() => handleSessionClick(session.session_id)}
                            className="w-full text-left px-3 py-2.5 pr-10"
                            aria-current={
                              session.session_id === sessionId ? "true" : undefined
                            }
                          >
                            <p className="line-clamp-2 text-xs leading-relaxed">
                              {session.first_message}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                              {new Date(session.created_at).toLocaleDateString()}
                            </p>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteChat(session.session_id, e)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      {(!chatSessions || chatSessions.length === 0) && (
                        <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                          No recent chats
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Studio Content List */}
              {currentView === "studio" && isInsideNotebook && (
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-1">
                      {/* Only show Flashcards section if flashcards exist */}
                      {flashcards && flashcards.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground px-3 py-2 font-semibold">Flashcards</p>
                          {flashcards.map((flashcard) => (
                            <button
                              key={flashcard.id}
                              className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-secondary/50"
                            >
                              <p className="line-clamp-2 text-xs leading-relaxed">{flashcard.title}</p>
                            </button>
                          ))}
                        </>
                      )}
                      
                      {/* Only show Quizzes section if quizzes exist */}
                      {quizzes && quizzes.length > 0 && (
                        <>
                          <p className="text-xs text-muted-foreground px-3 py-2 font-semibold mt-2">Quizzes</p>
                          {quizzes.map((quiz) => (
                            <button
                              key={quiz.id}
                              className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-secondary/50"
                            >
                              <p className="line-clamp-2 text-xs leading-relaxed">{quiz.title}</p>
                            </button>
                          ))}
                        </>
                      )}
                      
                      {/* Empty state when no flashcards or quizzes */}
                      {(!flashcards || flashcards.length === 0) && (!quizzes || quizzes.length === 0) && (
                        <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                          No study materials yet
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Notebooks List */}
              {isOnNotebooksPage && (
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-1">
                      {notebooks.map((notebook) => (
                        <button
                          key={notebook.id}
                          onClick={() => openNotebook(notebook.id)}
                          className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-secondary/50"
                        >
                          <p className="line-clamp-2 text-xs leading-relaxed">{notebook.name}</p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Section - Theme & Account */}
        <div className="py-4 flex flex-col items-center space-y-2 w-[74px] self-start">
          {/* Theme Toggle */}
          <div className="flex flex-col items-center justify-center">
            <ThemeToggle />
            <span className="text-[11px] text-muted-foreground mt-1">Theme</span>
          </div>

          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex flex-col items-center justify-center w-[60px] h-[60px] rounded-xl hover:bg-secondary/50 transition-colors"
                aria-label="Account settings"
              >
                <User className="w-5 h-5" />
                <span className="text-[11px] text-muted-foreground mt-1">Account</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/change-password")}
                className="hover:bg-secondary focus:bg-secondary"
              >
                <Settings className="w-4 h-4 mr-2" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSignOut}
                className="text-red-600 hover:bg-secondary focus:bg-secondary hover:text-red-600 focus:text-red-600 data-[highlighted]:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this chat session and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
