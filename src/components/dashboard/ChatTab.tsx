import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Copy, RefreshCw, Share2 } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useNotebook } from "@/contexts/NotebookContext";
import { useParams } from "react-router-dom";
import MarkdownMessage from "./MarkdownMessage";

interface Message {
  id: string;
  message_type: string;
  content: string;
  sources_referenced?: string[];
  created_at: string;
}

interface ChatSession {
  session_id: string;
  created_at: string;
  first_message: string;
}

const ChatTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { notebookId } = useParams<{ notebookId: string }>();
  const { currentNotebook } = useNotebook();
  const { sessionId } = useDashboard();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);


  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat-messages", sessionId, notebookId],
    queryFn: async () => {
      let query = supabase
        .from("chat_histories")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      // Filter by notebook_id if inside a notebook
      if (notebookId) {
        query = query.eq("notebook_id", notebookId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Message[];
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Save user message
      const { error: saveError } = await supabase.from("chat_histories").insert({
        user_id: userData.user.id,
        session_id: sessionId,
        message_type: "user",
        content,
        notebook_id: notebookId || null,
      });

      if (saveError) throw saveError;

      // Add temporary loading message
      await supabase.from("chat_histories").insert({
        user_id: userData.user.id,
        session_id: sessionId,
        message_type: "assistant",
        content: "...",
        notebook_id: notebookId || null,
      });

      queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId, notebookId] });

      // Call chat edge function
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { message: content, sessionId, notebookId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId, notebookId] });
      setMessage("");
    },
    onError: (error: Error & { context?: { error?: string } }) => {
      console.error("Failed to send chat message", error);
      const description =
        error.message === "Edge Function returned a non-2xx status code"
          ? error.context?.error ?? "Edge Function returned a non-2xx status code"
          : error.message;
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description,
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  const copyMessage = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
    toast({ title: "Message copied to clipboard" });
  };

  const regenerateMessage = () => {
    const lastUserMessage = messages?.filter(m => m.message_type === "user").pop();
    if (lastUserMessage) {
      sendMessageMutation.mutate(lastUserMessage.content);
    }
  };

  const shareMessage = (content: string) => {
    const shareData = {
      title: "Nexon AI Chat",
      text: content,
    };
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      copyMessage(content, "share");
    }
  };

  // Reusable input form (used in empty state and when messages exist)
  const InputForm = ({ wrapperClass = "max-w-2xl mx-auto px-4 py-4" }: { wrapperClass?: string }) => (
    <div className={wrapperClass}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end gap-3 bg-muted/30 border border-border/50 rounded-3xl p-3 focus-within:border-primary/50 transition-colors">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="I have access to all your uploaded sources. Ask anything about your study materials..."
            className="flex-1 min-h-[120px] max-h-[300px] resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 px-2"
            disabled={sendMessageMutation.isPending}
            autoFocus
          />

          <div className="flex items-center gap-2 pb-2">
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={sendMessageMutation.isPending || !message.trim()}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {!messages || messages.length === 0 ? (
          /* Empty State - Centered Branding */
          <div className="flex flex-col items-center justify-center h-full">
            <div className="flex items-center gap-3 mb-3">
              <img
                src="/nexon-logo.svg"
                alt="Nexora AI"
                className="w-12 h-12"
              />
              <h1 className="text-4xl font-semibold text-foreground">Nexora AI</h1>
            </div>
            {/* Centered input shown when there are no messages */}
            <div className="w-full">
              <InputForm wrapperClass="max-w-2xl mx-auto px-4 py-4" />
            </div>
          </div>
        ) : (
          /* Messages Display */
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.message_type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.message_type === "user"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/50 border border-border/50"
                  }`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownMessage content={msg.content} />
                  </div>
                  
                  {/* Source Citations */}
                  {msg.sources_referenced && msg.sources_referenced.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources_referenced.map((source, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-background/50 px-2 py-1 rounded-md border border-border/30"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Message Actions */}
                  {msg.message_type === "assistant" && msg.content !== "..." && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyMessage(msg.content, msg.id)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={regenerateMessage}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => shareMessage(msg.content)}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Fixed at Bottom (only when messages exist) */}
      {messages && messages.length > 0 && (
        <div className="border-border/50 bg-background/95 backdrop-blur-sm">
          <InputForm wrapperClass="max-w-2xl mx-auto px-4 py-4" />
        </div>
      )}
    </div>
  );
};

export default ChatTab;
