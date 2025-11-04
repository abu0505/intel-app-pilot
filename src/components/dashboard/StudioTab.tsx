import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlobalWorkerOptions, getDocument, version } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Trash2, Globe, Video, Folder, FolderOpen, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StudyActions } from "@/components/dashboard/StudyActions";
import DiscoverModal from "@/components/dashboard/DiscoverModal";
import SourcePreviewModal from "@/components/dashboard/SourcePreviewModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotebook } from "@/contexts/NotebookContext";
import { useDashboard } from "@/contexts/DashboardContext";
import { useParams } from "react-router-dom";

  const StudioTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { notebookId } = useParams<{ notebookId: string }>();
  const { currentNotebook, updateNotebook, fetchNotebooks } = useNotebook();
  const { selectedSourceIds, setSelectedSourceIds, toggleSourceSelection } = useDashboard();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [sourceType, setSourceType] = useState<string>("text");
  const [activeSourceType, setActiveSourceType] = useState<string | "all">("all");
  const [previewSource, setPreviewSource] = useState<any>(null);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false);
  const [isRunningOCR, setIsRunningOCR] = useState(false);
  const [isDiscoverModalOpen, setIsDiscoverModalOpen] = useState(false);

  // Configure PDF.js worker - use CDN for better Vite compatibility
  if (!GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;
  }

  const fallbackTitleFromUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace(/^www\./, "");
      const pathSegments = parsed.pathname
        .split("/")
        .filter(Boolean)
        .map((segment) => segment.replace(/[-_]/g, " "));
      if (pathSegments.length > 0) {
        return `${hostname} – ${pathSegments[pathSegments.length - 1]}`.replace(/\s+/g, " ").trim();
      }
      return hostname;
    } catch {
      return url;
    }
  };

  const fetchYouTubeMetadata = async (videoUrl: string): Promise<string | null> => {
    try {
      const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
      if (!videoIdMatch) return null;
      
      const videoId = videoIdMatch[1];
      
      // Use YouTube oEmbed API (no API key required)
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.title || null;
      }
    } catch (e) {
      console.error("Failed to fetch YouTube metadata:", e);
    }
    
    return null;
  };

  const generateSourceTitle = async (options: {
    manualTitle: string;
    sourceTypeValue: string;
    sourceUrlValue: string;
    contentValue: string;
  }) => {
    const { manualTitle, sourceTypeValue, sourceUrlValue, contentValue } = options;
    if (manualTitle) {
      return manualTitle;
    }

    // For YouTube videos, try to get the actual video title first
    if (sourceTypeValue === "youtube" && sourceUrlValue) {
      const youtubeTitle = await fetchYouTubeMetadata(sourceUrlValue);
      if (youtubeTitle) {
        return youtubeTitle;
      }
    }

    const promptParts = [
      "Generate a concise, human-friendly title (maximum 6 words) for a study resource.",
      "Return only the title without quotes.",
      `Source type: ${sourceTypeValue}`,
    ];

    if (sourceUrlValue) {
      promptParts.push(`Source URL: ${sourceUrlValue}`);
    }

    if (contentValue) {
      const trimmedContent = contentValue.trim().slice(0, 2000);
      promptParts.push(`Content:\n${trimmedContent}`);
    }

    const prompt = `${promptParts.join("\n\n")}\n\nTitle:`;

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { message: prompt, sessionId: crypto.randomUUID() },
      });

      if (!error) {
        const suggestion = typeof data?.message === "string" ? data.message.trim() : "";
        if (suggestion) {
          return suggestion.replace(/^"|"$/g, "");
        }
      } else {
        console.error("Failed to generate title via AI", error);
      }
    } catch (err) {
      console.error("AI title generation failed", err);
    }

    if (sourceUrlValue) {
      return fallbackTitleFromUrl(sourceUrlValue);
    }

    return "Untitled Source";
  };

  const { data: sources, isLoading, refetch } = useQuery({
    queryKey: ["sources", notebookId],
    queryFn: async () => {
      let query = supabase
        .from("sources")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by notebook_id if inside a notebook
      if (notebookId) {
        query = query.eq("notebook_id", notebookId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const availableSourceTypes = useMemo(() => {
    if (!sources) {
      return [];
    }

    const types = new Set<string>();
    for (const source of sources) {
      if (source.source_type) {
        types.add(source.source_type);
      }
    }
    return Array.from(types);
  }, [sources]);

  const filteredSources = useMemo(() => {
    if (!sources) {
      return [];
    }

    let result = sources;

    // Filter by type
    if (activeSourceType !== "all") {
      result = result.filter((source) => source.source_type === activeSourceType);
    }

    // Sort by date (most recent first)
    result = [...result].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return result;
  }, [sources, activeSourceType]);

  const toggleSelectAll = () => {
    if (selectedSourceIds.length === filteredSources.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(filteredSources.map(s => s.id));
    }
  };

  const toggleSourceExpand = (sourceId: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  };


  const loadPdfDocument = async (arrayBuffer: ArrayBuffer) => {
    try {
      return await getDocument({ data: arrayBuffer }).promise;
    } catch (primaryError) {
      console.warn("Primary PDF load failed, retrying with fallback options", primaryError);
      return await getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        disableFontFace: true,
      }).promise;
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    setIsExtractingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await loadPdfDocument(arrayBuffer);
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n\n";
      }

      const trimmedText = fullText.trim();
      
      // Check if we got meaningful text (at least 50 characters)
      if (trimmedText.length < 50) {
        console.log("Minimal text extracted, marking for OCR");
        return ""; // Empty string signals OCR needed
      }
      
      return trimmedText;
    } catch (error) {
      console.error("PDF extraction error:", error);
      // Return empty string to trigger OCR instead of throwing
      return "";
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const uploadPdfToStorage = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    
    const { data, error } = await supabase.storage
      .from("pdf-uploads")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }

    return data.path;
  };

  const runOCROnPdf = async (sourceId: string, storagePath: string): Promise<string> => {
    setIsRunningOCR(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-pdf-ocr", {
        body: { sourceId, storagePath },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "OCR processing failed");
      }

      return "OCR completed successfully";
    } finally {
      setIsRunningOCR(false);
    }
  };

  const addSourceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const rawTitle = formData.get("sourceName");
      const manualTitle = typeof rawTitle === "string" ? rawTitle.trim() : "";
      const rawUrl = formData.get("sourceUrl");
      const sourceUrlValue = typeof rawUrl === "string" ? rawUrl.trim() : "";
      const rawContent = formData.get("content");
      let contentValue = typeof rawContent === "string" ? rawContent : "";

      // Extract text from PDF if PDF file is uploaded
      let needsOCR = false;
      let storagePath = "";
      
      if (sourceType === "pdf" && pdfFile) {
        contentValue = await extractTextFromPdf(pdfFile);
        
        // If extraction returned empty/minimal text, we need OCR
        if (!contentValue || contentValue.length < 50) {
          needsOCR = true;
          // Upload to storage for OCR processing
          storagePath = await uploadPdfToStorage(pdfFile);
          // Use placeholder content for now
          contentValue = "[PDF uploaded - OCR processing in progress]";
        }
      }

      const processedContent = sourceType === "text" || sourceType === "pdf" ? contentValue : "";

      // For YouTube videos, we'll fetch transcript after creating the source
      const isYouTubeSource = sourceType === "youtube";

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const finalTitle = await generateSourceTitle({
        manualTitle,
        sourceTypeValue: sourceType,
        sourceUrlValue,
        contentValue: processedContent,
      });

      const { data, error } = await supabase
        .from("sources")
        .insert({
          user_id: userData.user.id,
          source_type: sourceType,
          source_name: finalTitle,
          source_url: sourceUrlValue || null,
          content: processedContent,
          source_description: null,
          word_count: processedContent ? processedContent.split(/\s+/).length : 0,
          notebook_id: notebookId || null,
          processing_status: 'processing',
        })
        .select()
        .single();

      if (error) throw error;

      // For PDFs that need OCR, process them now
      if (needsOCR && storagePath) {
        try {
          await runOCROnPdf(data.id, storagePath);
          // Trigger embeddings after successful OCR
          await supabase.functions.invoke("generate-embeddings", {
            body: { sourceId: data.id },
          });
        } catch (ocrError) {
          console.error("OCR processing error:", ocrError);
          toast({
            variant: "destructive",
            title: "OCR processing failed",
            description: "Unable to extract text from this PDF. It may be encrypted or have poor image quality.",
          });
        }
      } else if (sourceType === "pdf" && processedContent && !needsOCR) {
        // For PDFs with native text, generate embeddings
        await supabase.functions.invoke("generate-embeddings", {
          body: { sourceId: data.id },
        });
      }

      // For YouTube sources, fetch transcript
      if (isYouTubeSource && sourceUrlValue) {
        setIsFetchingTranscript(true);
        try {
          const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke(
            "fetch-youtube-transcript",
            {
              body: { sourceId: data.id, videoUrl: sourceUrlValue },
            }
          );

          if (transcriptError) {
            console.error("Transcript fetch error:", transcriptError);
            toast({
              variant: "destructive",
              title: "Transcript fetch failed",
              description: "Unable to fetch video transcript. You can still use this source, but AI features may be limited.",
            });
          } else if (transcriptData?.success) {
            // Trigger embeddings after successful transcript fetch
            await supabase.functions.invoke("generate-embeddings", {
              body: { sourceId: data.id },
            });
          }
        } catch (err) {
          console.error("YouTube transcript error:", err);
        } finally {
          setIsFetchingTranscript(false);
        }
      } else if (processedContent) {
        // Generate embeddings for text/PDF sources
        await supabase.functions.invoke("generate-embeddings", {
          body: { sourceId: data.id },
        });
        
        // Generate summary
        supabase.functions.invoke("generate-summary", {
          body: { sourceId: data.id, content: processedContent }
        }).catch(err => console.error("Summary generation failed:", err));
      }

      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["sources", notebookId] });

      // Update notebook updated_at when source is added
      if (notebookId) {
        await supabase
          .from("notebooks")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", notebookId);
      }

      // If this is the first source in the notebook, generate notebook name
      if (notebookId && currentNotebook?.name === "Untitled Notebook") {
        try {
          const { data: sourceData } = await supabase
            .from("sources")
            .select("content")
            .eq("id", data.id)
            .single();

          if (sourceData?.content) {
            const { data: nameData } = await supabase.functions.invoke("generate-notebook-name", {
              body: {
                sourceContent: sourceData.content,
                sourceTitle: data.source_name,
                notebookId,
              },
            });

            if (nameData?.success) {
              // Invalidate notebooks query
              queryClient.invalidateQueries({ queryKey: ["notebooks"] });
              
              // Update the notebook directly
              await updateNotebook(notebookId, { 
                name: nameData.name,
                icon: nameData.icon || currentNotebook.icon 
              });
              
              toast({
                title: "Notebook renamed",
                description: `Renamed to "${nameData.name}"`,
              });
            }
          }
        } catch (error) {
          console.error("Failed to generate notebook name:", error);
        }
      }
      
      if (sourceType === "youtube") {
        toast({
          title: "YouTube source added",
          description: isFetchingTranscript 
            ? "Fetching transcript... This may take a moment."
            : "Source added successfully.",
        });
      } else if (sourceType === "pdf" && isRunningOCR) {
        toast({
          title: "PDF uploaded",
          description: "Running OCR to extract text... This may take a minute for scanned PDFs.",
        });
      } else {
        toast({
          title: "Source added successfully",
          description: "Your source has been saved and indexed.",
        });
      }
      
      setShowAddDialog(false);
      setPdfFile(null);
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

  const getSourceIcon = (type: string, isSelected: boolean) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case "website":
        return <Globe className={`${iconClass} ${isSelected ? "text-primary" : "text-blue-400"}`} />;
      case "youtube":
        return <Video className={`${iconClass} ${isSelected ? "text-primary" : "text-red-500"}`} />;
      case "pdf":
        return <FileText className={`${iconClass} ${isSelected ? "text-primary" : "text-rose-400"}`} />;
      default:
        return isSelected ? <FolderOpen className={`${iconClass} text-primary`} /> : <Folder className={`${iconClass} text-muted-foreground`} />;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        setSourceType('pdf');
        setShowAddDialog(true);
      } else if (file.type === 'text/plain') {
        const content = await file.text();
        setSourceType('text');
        setShowAddDialog(true);
        // We'll need to set this in the form somehow
      } else {
        toast({
          variant: "destructive",
          title: "Unsupported file type",
          description: "Please upload PDF or TXT files",
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="flex flex-1 overflow-hidden min-h-0 gap-3 p-4">
        {/* Sources Sidebar */}
        <TooltipProvider delayDuration={0}>
          <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto [scrollbar-gutter:stable]">
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Sources
              </h3>
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsDiscoverModalOpen(true)}
              >
                Discover
              </Button>
            </div>

              {/* Drag & Drop Zone */}
              {(!sources || sources.length === 0) && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                    isDragging 
                      ? 'border-primary bg-primary/10 scale-105' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop files here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, TXT supported
                  </p>
                </div>
              )}

            <div className="flex items-center gap-2 mb-3">
              <Button
                variant={activeSourceType === "all" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setActiveSourceType("all")}
              >
                <Folder className="h-4 w-4" />
              </Button>
              {availableSourceTypes.map((type) => {
                const isActive = activeSourceType === type;
                return (
                  <Button
                    key={type}
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setActiveSourceType(type)}
                    aria-label={`Filter ${type} sources`}
                  >
                    {getSourceIcon(type, isActive)}
                  </Button>
                );
              })}
            </div>

            {filteredSources.length > 0 && (
              <div className="mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="w-full justify-start text-xs"
                >
                  {selectedSourceIds.length === filteredSources.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2 mt-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredSources.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No sources yet
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSources.map((source) => {
                  const isSelected = selectedSourceIds.includes(source.id);
                  const isExpanded = expandedSources.has(source.id);
                  
                  return (
                    <div key={source.id} className="rounded-lg border border-border overflow-hidden">
                      <div className="group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/40">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSourceSelection(source.id)}
                          className="h-4 w-4 rounded border-border"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div 
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => toggleSourceExpand(source.id)}
                        >
                          <div className="flex-shrink-0">{getSourceIcon(source.source_type, isSelected)}</div>
                          <span className="text-sm truncate flex-1" title={source.source_name}>
                            {source.source_name}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSourceMutation.mutate(source.id);
                          }}
                          aria-label="Delete source"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {isExpanded && source.ai_summary && (
                        <div className="px-3 py-2 bg-muted/20 border-t border-border">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Summary:</p>
                          <p className="text-xs text-foreground">{source.ai_summary}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>

        {/* Studio Content */}
        <div className="flex-1 min-h-0">
          <div className="h-full overflow-y-auto [scrollbar-gutter:stable] space-y-2 rounded-2xl border border-border/50 bg-card/60 p-4 shadow-lg shadow-primary/5 backdrop-blur-sm transition-shadow hover:shadow-xl scrollbar-muted">
            <StudyActions />
          </div>
        </div>
      </div>

      {/* Add Source Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Source</DialogTitle>
          </DialogHeader>
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
                  <SelectItem value="pdf">PDF Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceName">Title (optional)</Label>
              <Input
                id="sourceName"
                name="sourceName"
                placeholder="Let AI suggest a title"
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

            {sourceType === "text" && (
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Paste your study material here..."
                  rows={8}
                  required
                />
              </div>
            )}

            {sourceType === "pdf" && (
              <div className="space-y-2">
                <Label htmlFor="pdfFile">Upload PDF *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="pdfFile"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== "application/pdf") {
                          toast({
                            variant: "destructive",
                            title: "Invalid file type",
                            description: "Please upload a PDF file",
                          });
                          e.target.value = "";
                          return;
                        }
                        setPdfFile(file);
                      }
                    }}
                    required
                    className="cursor-pointer"
                  />
                </div>
                {pdfFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addSourceMutation.isPending || isExtractingPdf || isFetchingTranscript || isRunningOCR}>
                {isRunningOCR
                  ? "Running OCR..."
                  : isFetchingTranscript
                  ? "Fetching transcript..."
                  : isExtractingPdf
                  ? "Analyzing PDF..."
                  : addSourceMutation.isPending
                  ? "Adding..."
                  : "Add Source"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DiscoverModal
        open={isDiscoverModalOpen}
        onOpenChange={setIsDiscoverModalOpen}
        notebookId={notebookId!}
        onSourcesAdded={() => refetch()}
      />

      <SourcePreviewModal
        source={previewSource}
        isOpen={!!previewSource}
        onClose={() => setPreviewSource(null)}
      />
    </div>
  );
};

export default StudioTab;
