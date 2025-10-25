import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  message_type: string;
  content: string;
  sources_referenced?: string[];
  created_at: string;
}

const ChatTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    onError: (error: Error) => {
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          AI Study Assistant
          <Sparkles className="w-6 h-6 text-accent" />
        </h2>
        <p className="text-muted-foreground mt-1">Ask questions about your uploaded sources</p>
      </div>

      <Card style={{ boxShadow: "var(--shadow-medium)" }}>
        <CardContent className="p-0">
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse">Loading chat...</div>
              </div>
            ) : messages?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Bot className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">Start a conversation</p>
                <p className="text-muted-foreground max-w-md">
                  I have access to all your uploaded sources. Ask me anything about your learning materials!
                </p>
              </div>
            ) : (
              messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.message_type === "user" ? "justify-end" : ""}`}
                >
                  {msg.message_type === "assistant" && (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl p-4 ${
                      msg.message_type === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.content === "..." ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.sources_referenced && msg.sources_referenced.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {msg.sources_referenced.map((sourceId, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                Source {idx + 1}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {msg.message_type === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask a question about your sources..."
                className="min-h-[60px] resize-none"
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
                className="h-[60px] w-[60px]"
                disabled={!message.trim() || sendMessageMutation.isPending}
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatTab;
