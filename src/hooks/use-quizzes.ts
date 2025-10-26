import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GenerateQuizOptions = {
  difficulty?: "easy" | "medium" | "hard";
  questionCount?: number;
  topic?: string;
};

export const DEFAULT_QUIZ_OPTIONS: Required<Pick<GenerateQuizOptions, "difficulty" | "questionCount">> = {
  difficulty: "medium",
  questionCount: 10,
};

export function useQuizzes() {
  const queryClient = useQueryClient();

  const quizzesQuery = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

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

  return {
    quizzes: quizzesQuery.data,
    isLoading: quizzesQuery.isLoading,
    isError: quizzesQuery.isError,
    error: quizzesQuery.error,
    refetch: quizzesQuery.refetch,
    generateQuizMutation,
  };
}
