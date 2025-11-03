import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, Copy, RefreshCw, Share2, ThumbsUp, ThumbsDown, Download } from "lucide-react";
import { VoiceInput } from "./VoiceInput";
import { TypewriterText } from "./TypewriterText";
import { useDashboard } from "@/contexts/DashboardContext";
import { useNotebook } from "@/contexts/NotebookContext";
import { useParams } from "react-router-dom";
import MarkdownMessage from "./MarkdownMessage";
import { LoadingMessage } from "./LoadingMessage";
import { ChatInput } from "./ChatInput";

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
  const { notebookId } = useParams<{ notebookId: string }>();
  const { currentNotebook } = useNotebook();
  const { sessionId } = useDashboard();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [reactions, setReactions] = useState<Record<string, 'up' | 'down' | null>>({});
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const suggestedQuestions = [
    "Explain this concept in simple terms",
    "Create a quiz to test my knowledge",
    "Generate flashcards for this topic",
    "What are the key points I should remember?",
  ];

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat-messages", sessionId, notebookId],
    queryFn: async () => {
      let query = supabase
        .from("chat_histories")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

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

      const userMessage = {
        id: `temp-${Date.now()}`,
        message_type: "user",
        content,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ["chat-messages", sessionId, notebookId],
        (old: Message[] | undefined) => {
          return [...(old || []), userMessage];
        }
      );

      setMessage("");

      try {
        const { error: saveError } = await supabase
          .from("chat_histories")
          .insert({
            user_id: userData.user.id,
            session_id: sessionId,
            message_type: "user",
            content,
            notebook_id: notebookId || null,
          });
        if (saveError) throw saveError;

        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: { message: content, sessionId, notebookId },
        });
        if (error) throw error;

        if (notebookId) {
          await supabase
            .from("notebooks")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", notebookId);
        }

        return data;
      } catch (error) {
        queryClient.invalidateQueries({
          queryKey: ["chat-messages", sessionId, notebookId],
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", sessionId, notebookId],
      });
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
    const lastUserMessage = messages
      ?.filter((m) => m.message_type === "user")
      .pop();
    if (lastUserMessage) {
      sendMessageMutation.mutate(lastUserMessage.content);
    }
  };

  const shareMessage = (content: string) => {
    const shareData = {
      title: "Nexora AI Chat",
      text: content,
    };
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      copyMessage(content, "share");
    }
  };

  const handleReaction = async (messageId: string, reaction: 'up' | 'down') => {
    setReactions(prev => ({
      ...prev,
      [messageId]: prev[messageId] === reaction ? null : reaction
    }));
    toast({ 
      title: reaction === 'up' ? "Thanks for the feedback!" : "We'll improve",
      description: reaction === 'up' ? "Glad you found this helpful" : "Sorry this wasn't helpful"
    });
  };

  const exportChat = () => {
    if (!messages || messages.length === 0) return;
    
    const chatText = messages.map(msg => 
      `${msg.message_type.toUpperCase()}: ${msg.content}\n\n`
    ).join('');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Chat exported successfully" });
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* SCROLLABLE CONTAINER - Messages + Input */}
      <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable] min-h-0 w-full scrollbar-muted">
        {!messages || messages.length === 0 ? (
          // EMPTY STATE - LOGO + TEXTAREA CENTER
          <div className="h-full w-full flex flex-col items-center justify-center px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <img
                src="/nexon-logo.svg"
                alt="Nexora AI"
                className="w-12 h-12 opacity-80"
              />
              <h1 className="text-3xl font-bold text-foreground">Nexon AI</h1>
            </div>
            
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Ask me anything about your study materials
            </p>

            {/* Suggested Questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 max-w-2xl w-full">
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setMessage(question);
                    handleSubmit(new Event('submit') as any);
                  }}
                  className="text-left p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <p className="text-sm">{question}</p>
                </button>
              ))}
            </div>

            {/* TEXTAREA CENTER */}
            <div className="w-full max-w-2xl">
              <div className="flex items-center gap-2">
                <ChatInput
                  value={message}
                  onChange={setMessage}
                  onSubmit={handleSubmit}
                  disabled={sendMessageMutation.isPending}
                  wrapperClass="flex-1"
                />
                <VoiceInput 
                  onTranscript={(text) => setMessage(text)}
                  disabled={sendMessageMutation.isPending}
                />
              </div>
            </div>
          </div>
        ) : (
          // MESSAGES LIST - CENTERED WITH FULL WIDTH
          <div className="max-w-[740px] mx-auto w-full px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.message_type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.message_type === "user"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/50 border border-border/50"
                  }`}
                >
                  {msg.message_type === "assistant" && streamingMessageId === msg.id ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <TypewriterText 
                        text={msg.content} 
                        onComplete={() => setStreamingMessageId(null)}
                      />
                    </div>
                  ) : (
                    <MarkdownMessage content={msg.content} />
                  )}

                  {msg.sources_referenced &&
                    msg.sources_referenced.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Sources:
                        </p>
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

                  {msg.message_type === "assistant" && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(msg.content, msg.id)}
                        className="h-7 px-2 hover:bg-muted"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={regenerateMessage}
                        className="h-7 px-2 hover:bg-muted"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Regenerate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => shareMessage(msg.content)}
                        className="h-7 px-2 hover:bg-muted"
                      >
                        <Share2 className="w-3 h-3 mr-1" />
                        Share
                      </Button>
                      <div className="flex gap-1 ml-auto">
                        <Button
                          variant={reactions[msg.id] === 'up' ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleReaction(msg.id, 'up')}
                          className="h-7 w-7 p-0"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant={reactions[msg.id] === 'down' ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleReaction(msg.id, 'down')}
                          className="h-7 w-7 p-0"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {/* LOADING ANIMATION */}
            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <LoadingMessage />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* STICKY INPUT AT BOTTOM - Inside scroll container for full scrollbar height */}
        {messages && messages.length > 0 && (
          <div className="sticky bottom-0 max-w-[740px] mx-auto w-full border-border/30 bg-background py-4 px-4">
            <div className="flex items-center justify-between mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={exportChat}
                className="h-7"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <ChatInput
                value={message}
                onChange={setMessage}
                onSubmit={handleSubmit}
                disabled={sendMessageMutation.isPending}
                wrapperClass="flex-1"
              />
              <VoiceInput 
                onTranscript={(text) => setMessage(text)}
                disabled={sendMessageMutation.isPending}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatTab;
