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
import { LoadingMessage } from "./LoadingMessage";
import { ChatInput } from './ChatInput';


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
      
      // ✅ IMMEDIATELY add user message to state (optimistic)
      const userMessage = {
        id: `temp-${Date.now()}`,
        message_type: "user",
        content,
        created_at: new Date().toISOString(),
      };
      
      // IMMEDIATELY update query cache with user message
      queryClient.setQueryData(
        ["chat-messages", sessionId, notebookId],
        (old: Message[] | undefined) => {
          return [...(old || []), userMessage];
        }
      );

      // Reset textarea IMMEDIATELY
      setMessage("");

      // NOW call the API in background
      try {
        const { error: saveError } = await supabase.from("chat_histories").insert({
          user_id: userData.user.id,
          session_id: sessionId,
          message_type: "user",
          content,
          notebook_id: notebookId || null,
        });
        if (saveError) throw saveError;

        // Call AI
        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: { message: content, sessionId, notebookId },
        });
        if (error) throw error;

        // Update notebook
        if (notebookId) {
          await supabase
            .from("notebooks")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", notebookId);
        }

        return data;
      } catch (error) {
        // Rollback optimistic update on error
        queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId, notebookId] });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId, notebookId] });
    },
    onError: (error: Error) => {
      console.error("Failed to send chat message", error);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message,
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



  return (
    <div className="flex flex-col h-screen">
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
            
            {/* Show loading animation for first message */}
            {sendMessageMutation.isPending && (
              <div className="w-full max-w-2xl mb-4 px-4">
                <LoadingMessage />
              </div>
            )}
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
                  {msg.message_type === "assistant" && (
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

            {/* Show loading animation while AI is responding */}
            {sendMessageMutation.isPending && messages.at(-1)?.message_type === 'user' && (
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <LoadingMessage />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Textarea Position */}
      {!messages || messages.length === 0 ? (
        // CENTER - Empty state
        <div className="flex items-center justify-center flex-1">
          <ChatInput 
            value={message} 
            onChange={setMessage} 
            onSubmit={handleSubmit}
            disabled={sendMessageMutation.isPending}
            wrapperClass="max-w-2xl w-full mx-auto px-4"
          />
        </div>
      ) : (
        // BOTTOM - After first message (with smooth transition)
        <div className="transition-all duration-500 ease-out">
          <ChatInput 
            value={message} 
            onChange={setMessage} 
            onSubmit={handleSubmit}
            disabled={sendMessageMutation.isPending}
            wrapperClass="max-w-2xl mx-auto px-4 py-4 border-border/30"
          />
        </div>
      )}
    </div>
  );
};

export default ChatTab;
