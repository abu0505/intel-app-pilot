import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FlashcardItem = {
  front: string;
  back: string;
  difficulty: number;
  category: string;
};

export type FlashcardSource = {
  id: string;
  source_name: string;
  content: string;
};

export type FlashcardSet = {
  id: string;
  title: string;
  cards: FlashcardItem[];
  card_count: number;
  times_studied: number;
  average_retention_percentage: number;
  created_at: string;
  updated_at?: string;
};

export type GenerateFlashcardOptions = {
  cardCount?: number;
  difficulty?: "easy" | "medium" | "hard";
  topic?: string;
  sourceIds?: string[];
};

export const DEFAULT_FLASHCARD_OPTIONS: Required<Pick<GenerateFlashcardOptions, "cardCount" | "difficulty">> = {
  cardCount: 15,
  difficulty: "medium",
};

export function useFlashcards() {
  const queryClient = useQueryClient();

  const flashcardsQuery = useQuery<FlashcardSet[]>({
    queryKey: ["flashcards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("id, title, cards, card_count, times_studied, average_retention_percentage, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((item) => ({
        ...item,
        cards: Array.isArray(item.cards)
          ? (item.cards as FlashcardItem[])
          : typeof item.cards === "string"
            ? (JSON.parse(item.cards) as FlashcardItem[])
            : [],
      }));
    },
  });

  const sourcesQuery = useQuery<FlashcardSource[]>({
    queryKey: ["sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sources").select("id, source_name, content");
      if (error) throw error;
      return (data ?? []) as FlashcardSource[];
    },
  });

  const generateFlashcardsMutation = useMutation({
    mutationFn: async (options: GenerateFlashcardOptions = {}) => {
      const payload = {
        cardCount: options.cardCount ?? DEFAULT_FLASHCARD_OPTIONS.cardCount,
        difficulty: options.difficulty ?? DEFAULT_FLASHCARD_OPTIONS.difficulty,
        topic: options.topic?.trim() || undefined,
        sourceIds: options.sourceIds && options.sourceIds.length > 0 ? options.sourceIds : undefined,
      };

      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: payload,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
    },
  });

  const renameFlashcardsMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new Error("Title cannot be empty");
      }

      const { error } = await supabase
        .from("flashcards")
        .update({ title: trimmedTitle })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
    },
  });

  const deleteFlashcardsMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flashcards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
    },
  });

  return {
    flashcards: flashcardsQuery.data,
    isLoading: flashcardsQuery.isLoading,
    isError: flashcardsQuery.isError,
    error: flashcardsQuery.error,
    refetch: flashcardsQuery.refetch,
    sources: sourcesQuery.data,
    isSourcesLoading: sourcesQuery.isLoading,
    generateFlashcardsMutation,
    renameFlashcardsMutation,
    deleteFlashcardsMutation,
  };
}
