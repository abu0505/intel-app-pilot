import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Trash2, Globe, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SourcesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [sourceType, setSourceType] = useState<string>("text");

  const { data: sources, isLoading } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const addSourceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const sourceName = formData.get("sourceName") as string;
      let sourceUrl = formData.get("sourceUrl") as string;
      let content = formData.get("content") as string;
      const description = formData.get("description") as string;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Auto-fetch YouTube transcript if it's a YouTube URL
      if (sourceType === "youtube" && sourceUrl && !content.trim()) {
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke(
          "youtube-transcript",
          { body: { url: sourceUrl } }
        );

        if (transcriptError) throw new Error("Failed to fetch YouTube transcript: " + transcriptError.message);
        if (transcriptData?.transcript) {
          content = transcriptData.transcript;
        }
      }

      const { data, error } = await supabase
        .from("sources")
        .insert({
          user_id: userData.user.id,
          source_type: sourceType,
          source_name: sourceName,
          source_url: sourceUrl || null,
          content: content,
          source_description: description || null,
          word_count: content.split(/\s+/).length,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate embeddings in the background
      await supabase.functions.invoke("generate-embeddings", {
        body: { sourceId: data.id },
      });

      // Generate AI summary and add to chat
      const sessionId = crypto.randomUUID();
      await supabase.functions.invoke("generate-summary", {
        body: { sourceId: data.id, sessionId },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast({
        title: "Source added successfully",
        description: "Your source has been saved and indexed.",
      });
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to add source",
        description: error.message,
      });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const { error } = await supabase.from("sources").delete().eq("id", sourceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast({
        title: "Source deleted",
        description: "The source has been removed.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addSourceMutation.mutate(formData);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "website":
        return <Globe className="w-4 h-4" />;
      case "youtube":
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Your Learning Sources</h2>
          <p className="text-muted-foreground mt-1">Add materials to build your knowledge base</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </Button>
      </div>

      {showAddForm && (
        <Card style={{ boxShadow: "var(--shadow-medium)" }}>
          <CardHeader>
            <CardTitle>Add New Source</CardTitle>
            <CardDescription>Upload content for AI to learn from</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sourceType">Source Type</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Content</SelectItem>
                    <SelectItem value="website">Website URL</SelectItem>
                    <SelectItem value="youtube">YouTube Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceName">Title *</Label>
                <Input
                  id="sourceName"
                  name="sourceName"
                  placeholder="e.g., Introduction to Biology"
                  required
                />
              </div>

              {(sourceType === "website" || sourceType === "youtube") && (
                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">URL *</Label>
                  <Input
                    id="sourceUrl"
                    name="sourceUrl"
                    type="url"
                    placeholder="https://..."
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="content">
                  Content {sourceType === "youtube" ? "(optional - auto-fetched from video)" : "*"}
                </Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder={
                    sourceType === "youtube"
                      ? "Leave empty to auto-fetch transcript from YouTube..."
                      : "Paste your study material here..."
                  }
                  rows={8}
                  required={sourceType !== "youtube"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Brief description of this source"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={addSourceMutation.isPending}>
                  {addSourceMutation.isPending ? "Adding..." : "Add Source"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
            </Card>
          ))
        ) : sources?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No sources yet. Add your first learning material to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          sources?.map((source) => (
            <Card key={source.id} style={{ boxShadow: "var(--shadow-soft)" }}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSourceIcon(source.source_type)}
                      <Badge variant="secondary">{source.source_type}</Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{source.source_name}</CardTitle>
                    {source.source_description && (
                      <CardDescription className="line-clamp-2 mt-1">
                        {source.source_description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSourceMutation.mutate(source.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {source.word_count} words • {new Date(source.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SourcesTab;
