import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Mic, Folder, Grid3x3 } from "lucide-react";
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
    <div className="flex flex-col items-center justify-center h-full w-full px-4">
      {/* Centered Branding */}
      <div className="flex flex-col items-center mb-12">
        <div className="flex items-center gap-3 mb-8">
          <img
            src="/nexon-logo.svg"
            alt="Nexora AI"
            className="w-12 h-12"
          />
          <h1 className="text-4xl font-semibold text-foreground">Nexora AI</h1>
        </div>

        {/* Main Card */}
        <Card className="w-full max-w-2xl bg-card/50 backdrop-blur border-border/50 shadow-lg">
          <CardContent className="p-8">
            <p className="text-muted-foreground text-center mb-6 leading-relaxed">
              I have access to all your uploaded sources. Ask me anything about your learning materials...
            </p>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg hover:bg-secondary/50"
              >
                <Mic className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg hover:bg-secondary/50"
              >
                <Folder className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg hover:bg-secondary/50"
              >
                <Grid3x3 className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                className="h-10 w-10 rounded-lg bg-primary hover:bg-primary/90"
                onClick={() => {
                  // Handle send action
                }}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatTab;
