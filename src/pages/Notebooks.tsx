import { useEffect, useState } from "react";
import { useNotebook } from "@/contexts/NotebookContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, MoreVertical, FileText, Clock, Edit, Trash, BookOpen, Menu } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CollapsibleSidebar } from "@/components/dashboard/CollapsibleSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { DashboardProvider } from "@/contexts/DashboardContext";

const NotebooksContent = () => {
  const { notebooks, loading, fetchNotebooks, createNotebook, updateNotebook, deleteNotebook, openNotebook } = useNotebook();
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; notebookId: string; currentName: string }>({
    open: false,
    notebookId: "",
    currentName: "",
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; notebookId: string; name: string }>({
    open: false,
    notebookId: "",
    name: "",
  });
  const [newName, setNewName] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const handleCreateNotebook = async () => {
    const notebookId = await createNotebook();
    if (notebookId) {
      openNotebook(notebookId);
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a notebook name",
        variant: "destructive",
      });
      return;
    }

    await updateNotebook(renameDialog.notebookId, { name: newName });
    setRenameDialog({ open: false, notebookId: "", currentName: "" });
    setNewName("");
  };

  const handleDelete = async () => {
    if (confirmText !== "Delete") {
      toast({
        title: "Error",
        description: 'Please type "Delete" to confirm',
        variant: "destructive",
      });
      return;
    }

    await deleteNotebook(deleteDialog.notebookId);
    setDeleteDialog({ open: false, notebookId: "", name: "" });
    setConfirmText("");
  };

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Loading notebooks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <CollapsibleSidebar
        onSignOut={handleSignOut}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
      />
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-40"
        onClick={toggleMobileSidebar}
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </Button>
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 container mx-auto px-4 py-6 overflow-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold">My Notebooks</h1>
            <Button onClick={handleCreateNotebook} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              New Notebook
            </Button>
          </div>

          {notebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <BookOpen className="w-24 h-24 text-muted-foreground/50 mb-6" />
              <h2 className="text-3xl font-semibold mb-3">No Notebooks Yet</h2>
              <p className="text-muted-foreground text-lg mb-8">Create your first notebook to get started</p>
              <Button onClick={handleCreateNotebook} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Notebook
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {notebooks.map((notebook) => (
                <Card
                  key={notebook.id}
                  className="p-6 hover:scale-105 transition-all cursor-pointer hover:shadow-lg border-2"
                  onClick={() => openNotebook(notebook.id)}
                >
                  <div className="text-5xl mb-4">{notebook.icon}</div>
                  
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-semibold truncate flex-1 pr-2">{notebook.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameDialog({
                              open: true,
                              notebookId: notebook.id,
                              currentName: notebook.name,
                            });
                            setNewName(notebook.name);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog({
                              open: true,
                              notebookId: notebook.id,
                              name: notebook.name,
                            });
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      {notebook.source_count || 0} sources
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {formatDistanceToNow(new Date(notebook.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Rename Dialog */}
          <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ ...renameDialog, open })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Notebook</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Notebook name"
                  autoFocus
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRenameDialog({ open: false, notebookId: "", currentName: "" })}>
                    Cancel
                  </Button>
                  <Button onClick={handleRename}>Rename</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Notebook</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. All sources, chats, quizzes, and flashcards in this notebook will be permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">
                    Type <span className="font-bold text-destructive">Delete</span> to confirm:
                  </p>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Delete"
                    className="border-destructive/50 focus:border-destructive"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialog({ open: false, notebookId: "", name: "" })}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={confirmText !== "Delete"}
                  >
                    Delete Notebook
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

const Notebooks = () => (
  <DashboardProvider>
    <NotebooksContent />
  </DashboardProvider>
);

export default Notebooks;
