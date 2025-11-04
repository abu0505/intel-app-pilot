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
import { Plus, MoreVertical, FileText, Clock, Edit, Trash, BookOpen, Menu, Archive, Search, SortAsc } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [archivedNotebooks, setArchivedNotebooks] = useState<string[]>([]);
  const [showArchivedDialog, setShowArchivedDialog] = useState(false);

  const gradients = [
    "from-purple-500/20 to-pink-500/20",
    "from-blue-500/20 to-cyan-500/20",
    "from-green-500/20 to-emerald-500/20",
    "from-orange-500/20 to-red-500/20",
    "from-indigo-500/20 to-purple-500/20",
  ];

  const filteredNotebooks = notebooks
    .filter(n => !archivedNotebooks.includes(n.id))
    .filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

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

  const handleArchive = (notebookId: string) => {
    setArchivedNotebooks(prev => [...prev, notebookId]);
    toast({ title: "Notebook archived" });
  };

  const handleUnarchive = (notebookId: string) => {
    setArchivedNotebooks(prev => prev.filter(id => id !== notebookId));
    toast({ title: "Notebook unarchived" });
  };

  const archivedNotebooksList = notebooks.filter(n => archivedNotebooks.includes(n.id));

  const getGradient = (index: number) => {
    return gradients[index % gradients.length];
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
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold">My Notebooks</h1>
              <Button onClick={handleCreateNotebook} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                New Notebook
              </Button>
            </div>
            
            {/* Search and Sort */}
            <div className="flex gap-3 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search notebooks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setSortBy(sortBy === "name" ? "date" : "name")}
              >
                <SortAsc className="w-4 h-4 mr-2" />
                Sort by {sortBy === "name" ? "Date" : "Name"}
              </Button>
              {archivedNotebooks.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowArchivedDialog(true)}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archived ({archivedNotebooks.length})
                </Button>
              )}
            </div>
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
              {filteredNotebooks.map((notebook, index) => (
                <Card
                  key={notebook.id}
                  className="group relative overflow-hidden hover:scale-105 transition-all cursor-pointer hover:shadow-2xl border-2"
                  onClick={() => openNotebook(notebook.id)}
                >
                  {/* Gradient Cover */}
                  <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-br ${getGradient(index)}`} />
                  
                  <div className="relative p-6">
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
                            handleArchive(notebook.id);
                          }}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Archive
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

          {/* Archived Notebooks Dialog */}
          <Dialog open={showArchivedDialog} onOpenChange={setShowArchivedDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Archived Notebooks</DialogTitle>
                <DialogDescription>
                  These notebooks have been archived. You can unarchive them to restore them to your main list.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {archivedNotebooksList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Archive className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No archived notebooks</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {archivedNotebooksList.map((notebook, index) => (
                      <Card key={notebook.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{notebook.icon}</span>
                            <div>
                              <h3 className="font-semibold">{notebook.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {notebook.source_count || 0} sources
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnarchive(notebook.id)}
                          >
                            Unarchive
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
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
