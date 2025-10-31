import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Notebook {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
  last_opened_at: string;
  is_deleted: boolean;
  source_count?: number;
}

interface NotebookContextType {
  currentNotebook: Notebook | null;
  setCurrentNotebook: (notebook: Notebook | null) => void;
  notebooks: Notebook[];
  loading: boolean;
  fetchNotebooks: () => Promise<void>;
  createNotebook: () => Promise<string | null>;
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  openNotebook: (notebookId: string) => Promise<void>;
}

const NotebookContext = createContext<NotebookContextType | undefined>(undefined);

export function NotebookProvider({ children }: { children: ReactNode }) {
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchNotebooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notebooks")
        .select("*, sources:sources(count)")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .order("last_opened_at", { ascending: false });

      if (error) throw error;

      const notebooksWithCount = data?.map((notebook: any) => ({
        ...notebook,
        source_count: notebook.sources[0]?.count || 0,
      }));

      setNotebooks(notebooksWithCount || []);
    } catch (error) {
      console.error("Error fetching notebooks:", error);
      toast({
        title: "Error",
        description: "Failed to load notebooks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createNotebook = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("notebooks")
        .insert({
          user_id: user.id,
          name: "Untitled Notebook",
          icon: "📝",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notebook created successfully",
      });

      await fetchNotebooks();
      return data.id;
    } catch (error) {
      console.error("Error creating notebook:", error);
      toast({
        title: "Error",
        description: "Failed to create notebook",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateNotebook = async (id: string, updates: Partial<Notebook>) => {
    try {
      const { error } = await supabase
        .from("notebooks")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notebook updated successfully",
      });

      await fetchNotebooks();
      
      if (currentNotebook?.id === id) {
        setCurrentNotebook({ ...currentNotebook, ...updates });
      }
    } catch (error) {
      console.error("Error updating notebook:", error);
      toast({
        title: "Error",
        description: "Failed to update notebook",
        variant: "destructive",
      });
    }
  };

  const deleteNotebook = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notebooks")
        .update({ is_deleted: true })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notebook deleted successfully",
      });

      await fetchNotebooks();
      
      if (currentNotebook?.id === id) {
        setCurrentNotebook(null);
        navigate("/notebooks");
      }
    } catch (error) {
      console.error("Error deleting notebook:", error);
      toast({
        title: "Error",
        description: "Failed to delete notebook",
        variant: "destructive",
      });
    }
  };

  const openNotebook = async (notebookId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update last_opened_at
      await supabase
        .from("notebooks")
        .update({ last_opened_at: new Date().toISOString() })
        .eq("id", notebookId);

      // Update user preferences
      await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          last_opened_notebook_id: notebookId,
          updated_at: new Date().toISOString(),
        });

      // Fetch notebook details
      const { data: notebook } = await supabase
        .from("notebooks")
        .select("*")
        .eq("id", notebookId)
        .single();

      if (notebook) {
        setCurrentNotebook(notebook);
      }

      navigate(`/studio/${notebookId}`);
    } catch (error) {
      console.error("Error opening notebook:", error);
      toast({
        title: "Error",
        description: "Failed to open notebook",
        variant: "destructive",
      });
    }
  };

  return (
    <NotebookContext.Provider
      value={{
        currentNotebook,
        setCurrentNotebook,
        notebooks,
        loading,
        fetchNotebooks,
        createNotebook,
        updateNotebook,
        deleteNotebook,
        openNotebook,
      }}
    >
      {children}
    </NotebookContext.Provider>
  );
}

export function useNotebook() {
  const context = useContext(NotebookContext);
  if (context === undefined) {
    throw new Error("useNotebook must be used within a NotebookProvider");
  }
  return context;
}
