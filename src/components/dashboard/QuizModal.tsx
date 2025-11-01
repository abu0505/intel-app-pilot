import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, X, Trophy } from "lucide-react";
import { useQuizzes } from "@/hooks/use-quizzes";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type QuizModalProps = {
  quizId: string | null;
  onClose: () => void;
};

export function QuizModal({ quizId, onClose }: QuizModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const { quizzes, isLoading } = useQuizzes();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedQuiz = quizzes?.find((q) => q.id === quizId);

  useEffect(() => {
    if (quizId) {
      setCurrentQuestionIndex(0);
      setAnswers({});
    }
  }, [quizId]);

  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuiz) return;

      const questions = selectedQuiz.questions as any[];
      let correct = 0;

      questions.forEach((q: any, idx: number) => {
        if (answers[idx] === q.correctAnswer) {
          correct++;
        }
      });

      const scorePercentage = (correct / questions.length) * 100;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const { error } = await supabase.from("quiz_attempts").insert({
        quiz_id: selectedQuiz.id,
        user_id: userData.user.id,
        score_percentage: scorePercentage,
        answers_provided: answers,
        correct_answers: correct,
        is_passed: scorePercentage >= 70,
      });

      if (error) throw error;
      return { scorePercentage, correct, total: questions.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      toast({
        title: "Quiz completed!",
        description: `You scored ${result?.scorePercentage.toFixed(0)}% (${result?.correct}/${result?.total})`,
      });
      onClose();
    },
  });

  if (!quizId) return null;

  if (isLoading) {
    return (
      <Dialog open={!!quizId} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!selectedQuiz) return null;

  const questions = selectedQuiz.questions as any[];
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const allAnswered = questions.every((_: any, idx: number) => answers[idx]);

  return (
    <Dialog open={!!quizId} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{selectedQuiz.title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
                <Badge variant="secondary">{selectedQuiz.difficulty_level}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-full bg-secondary h-2 rounded-full">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="space-y-4">
            <p className="text-xl font-semibold">{currentQuestion.question}</p>
            <div className="space-y-2">
              {currentQuestion.options.map((option: string, optIdx: number) => (
                <Button
                  key={optIdx}
                  variant={answers[currentQuestionIndex] === option ? "default" : "outline"}
                  className="w-full justify-start text-left"
                  onClick={() => setAnswers({ ...answers, [currentQuestionIndex]: option })}
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              ← Previous
            </Button>

            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                disabled={!allAnswered || submitQuizMutation.isPending}
                onClick={() => submitQuizMutation.mutate()}
              >
                <Trophy className="w-4 h-4 mr-2" />
                {submitQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
              </Button>
            ) : (
              <Button
                onClick={() =>
                  setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))
                }
              >
                Next →
              </Button>
            )}
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            {questions.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  idx === currentQuestionIndex
                    ? "bg-primary text-primary-foreground"
                    : answers[idx]
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
