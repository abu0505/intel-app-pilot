import { useState } from "react";
import { Search, Loader2, Globe, Video, BookOpen, Github, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DiscoverSource {
  type: "website" | "youtube" | "book" | "github";
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
  favicon?: string;
}

interface DiscoverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookId: string;
  onSourcesAdded: () => void;
}

const DiscoverModal = ({ open, onOpenChange, notebookId, onSourcesAdded }: DiscoverModalProps) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [results, setResults] = useState<DiscoverSource[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        variant: "destructive",
        title: "Enter a topic",
        description: "Please enter what you want to study",
      });
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSelectedUrls(new Set());

    try {
      const { data, error } = await supabase.functions.invoke("discover-sources", {
        body: { query: query.trim(), notebookId },
      });

      if (error) throw error;

      if (data?.sources && Array.isArray(data.sources)) {
        setResults(data.sources);
        if (data.sources.length === 0) {
          toast({
            title: "No results found",
            description: "Try a different search term",
          });
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error: any) {
      console.error("Discover search error:", error);
      toast({
        variant: "destructive",
        title: "Search failed",
        description: error.message || "Unable to search for sources",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelection = (url: string) => {
    const newSelected = new Set(selectedUrls);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedUrls(newSelected);
  };

  const handleAddSelected = async () => {
    if (selectedUrls.size === 0) {
      toast({
        variant: "destructive",
        title: "No sources selected",
        description: "Please select at least one source to add",
      });
      return;
    }

    setIsAdding(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("You must be logged in to add sources");
      }

      const selectedSources = results.filter((r) => selectedUrls.has(r.url));
      
      const sourcesToInsert = selectedSources.map((source) => ({
        user_id: user.id,
        notebook_id: notebookId,
        source_name: source.title,
        source_type: source.type === "youtube" ? "youtube" : "text",
        source_url: source.url,
        source_description: source.description,
        content: `Discovered source: ${source.title}\n\n${source.description}`,
        processing_status: "pending",
      }));

      const { error } = await supabase.from("sources").insert(sourcesToInsert);

      if (error) throw error;

      toast({
        title: "Sources added",
        description: `Successfully added ${selectedSources.length} source${selectedSources.length > 1 ? "s" : ""}`,
      });

      onSourcesAdded();
      onOpenChange(false);
      setQuery("");
      setResults([]);
      setSelectedUrls(new Set());
    } catch (error: any) {
      console.error("Add sources error:", error);
      toast({
        variant: "destructive",
        title: "Failed to add sources",
        description: error.message || "Please try again",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "youtube":
        return <Video className="h-4 w-4" />;
      case "book":
        return <BookOpen className="h-4 w-4" />;
      case "github":
        return <Github className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      youtube: "bg-red-500/10 text-red-500 border-red-500/20",
      book: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      github: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      website: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return colors[type as keyof typeof colors] || colors.website;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Discover Learning Resources</DialogTitle>
          <DialogDescription>
            Search for relevant resources across the web, YouTube, books, and more
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mt-4">
          <Input
            placeholder="What do you want to study? (e.g., Machine Learning, Python Programming)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={isSearching}
          />
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="flex justify-between items-center mt-4 mb-2">
            <p className="text-sm text-muted-foreground">
              Found {results.length} resources ({selectedUrls.size} selected)
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedUrls.size === results.length) {
                  setSelectedUrls(new Set());
                } else {
                  setSelectedUrls(new Set(results.map((r) => r.url)));
                }
              }}
            >
              {selectedUrls.size === results.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          {isSearching && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Searching for resources...</p>
            </div>
          )}

          {!isSearching && results.length === 0 && query && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <p>No results yet. Try searching for a topic.</p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((source, index) => (
              <div
                key={`${source.url}-${index}`}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50 ${
                  selectedUrls.has(source.url) ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => toggleSelection(source.url)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedUrls.has(source.url)}
                    onCheckedChange={() => toggleSelection(source.url)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {source.favicon && (
                          <img
                            src={source.favicon}
                            alt=""
                            className="w-4 h-4 flex-shrink-0"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        )}
                        <h4 className="font-medium text-sm line-clamp-2 break-words">
                          {source.title}
                        </h4>
                      </div>
                      <Badge variant="outline" className={getTypeBadge(source.type)}>
                        <span className="flex items-center gap-1">
                          {getTypeIcon(source.type)}
                          <span className="text-xs">{source.type}</span>
                        </span>
                      </Badge>
                    </div>
                    
                    {source.thumbnail && (
                      <img
                        src={source.thumbnail}
                        alt=""
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {source.description}
                    </p>
                    
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      {new URL(source.url).hostname}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {results.length > 0 && (
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelected}
              disabled={selectedUrls.size === 0 || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                `Add Selected (${selectedUrls.size})`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DiscoverModal;
