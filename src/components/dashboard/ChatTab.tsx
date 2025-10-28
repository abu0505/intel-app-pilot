import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Sparkles, Copy, RotateCcw, Share2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import MarkdownMessage from "@/components/dashboard/MarkdownMessage";
import { useDashboard } from "@/contexts/DashboardContext";

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
  const { sessionId } = useDashboard();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);


  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_histories")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

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
      });

      if (saveError) throw saveError;

      // Add temporary loading message
      await supabase.from("chat_histories").insert({
        user_id: userData.user.id,
        session_id: sessionId,
        message_type: "assistant",
        content: "...",
      });

      queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId] });

      // Call chat edge function
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { message: content, sessionId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId] });
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

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
        <Card className="flex-1 flex flex-col shadow-lg">
          <CardContent className="p-0 flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="text-sm text-muted-foreground">Loading chat...</p>
                    </div>
                  </div>
                ) : messages?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-6 mb-4">
                      <Bot className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                    <p className="text-muted-foreground max-w-md mb-4">
                      I have access to all your uploaded sources. Ask me anything about your learning materials!
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-all" onClick={() => setMessage("Summarize my recent notes")}>
                        📝 Summarize my notes
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-all" onClick={() => setMessage("Create a study plan for this week")}>
                        📅 Create study plan
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-all" onClick={() => setMessage("Explain the key concepts from my sources")}>
                        💡 Explain concepts
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-all" onClick={() => setMessage("Generate practice questions")}>
                        ❓ Practice questions
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-all" onClick={() => setMessage("Compare different topics from my sources")}>
                        🔄 Compare topics
                      </Badge>
                    </div>
                  </div>
                ) : (
                  messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`group flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${
                        msg.message_type === "user" ? "justify-end" : ""
                      }`}
                    >
                      {msg.message_type === "assistant" && (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Bot className="w-5 h-5 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex flex-col gap-2 max-w-[90%]">
                        {/* Context Pills - Show before AI message */}
                        {msg.message_type === "assistant" && msg.sources_referenced && msg.sources_referenced.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 px-2">
                            <span className="text-xs text-muted-foreground">Using sources:</span>
                            {msg.sources_referenced.map((sourceId, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs border-primary/50 bg-primary/5">
                                📚 Source {idx + 1}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div
                          className={`rounded-2xl p-4 shadow-sm ${
                            msg.message_type === "user"
                              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground"
                              : "bg-muted/50 backdrop-blur"
                          }`}
                        >
                          {msg.content === "..." ? (
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-4 w-5/6" />
                            </div>
                          ) : (
                            <MarkdownMessage content={msg.content} />
                          )}
                        </div>
                        {/* Message Actions */}
                        {msg.content !== "..." && (
                          <div className="flex gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => copyMessage(msg.content, msg.id)}
                            >
                              {copiedMessageId === msg.id ? (
                                <Check className="w-3 h-3 mr-1" />
                              ) : (
                                <Copy className="w-3 h-3 mr-1" />
                              )}
                              Copy
                            </Button>
                            {msg.message_type === "assistant" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={regenerateMessage}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Regenerate
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => shareMessage(msg.content)}
                            >
                              <Share2 className="w-3 h-3 mr-1" />
                              Share
                            </Button>
                          </div>
                        )}
                      </div>
                      {msg.message_type === "user" && (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t bg-background p-4">
              <form onSubmit={handleSubmit} className="flex gap-3">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask a question about your sources..."
                  className="min-h-[64px] resize-none rounded-xl border-2 focus-visible:ring-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-[64px] w-[64px] rounded-xl shadow-lg"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>
    </div>
  );
};

export default ChatTab;
