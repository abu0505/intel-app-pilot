import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GenerateQuizOptions = {
  difficulty?: "easy" | "medium" | "hard";
  questionCount?: number;
  topic?: string;
  sourceIds?: string[];
};

export const DEFAULT_QUIZ_OPTIONS: Required<Pick<GenerateQuizOptions, "difficulty" | "questionCount">> = {
  difficulty: "medium",
  questionCount: 10,
};

export function useQuizzes(notebookId?: string) {
  const queryClient = useQueryClient();

  const quizzesQuery = useQuery({
    queryKey: ["quizzes", notebookId],
    queryFn: async () => {
      let query = supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      if (notebookId) {
        query = query.eq("notebook_id", notebookId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const generateQuizMutation = useMutation({
    mutationFn: async (options: GenerateQuizOptions = {}) => {
      const payload = {
        difficulty: options.difficulty ?? DEFAULT_QUIZ_OPTIONS.difficulty,
        questionCount: options.questionCount ?? DEFAULT_QUIZ_OPTIONS.questionCount,
        topic: options.topic?.trim() || undefined,
        sourceIds: options.sourceIds && options.sourceIds.length > 0 ? options.sourceIds : undefined,
      };

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: payload,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });

  const renameQuizMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new Error("Title cannot be empty");
      }

      const { error } = await supabase
        .from("quizzes")
        .update({ title: trimmedTitle })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
  });

  return {
    quizzes: quizzesQuery.data,
    isLoading: quizzesQuery.isLoading,
    isError: quizzesQuery.isError,
    error: quizzesQuery.error,
    refetch: quizzesQuery.refetch,
    generateQuizMutation,
    renameQuizMutation,
    deleteQuizMutation,
  };
}
