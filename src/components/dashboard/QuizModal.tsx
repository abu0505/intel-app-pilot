import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, X, Trophy, Lightbulb } from "lucide-react";
import { useQuizzes } from "@/hooks/use-quizzes";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type QuizModalProps = {
  quizId: string | null;
  onClose: () => void;
};

export function QuizModal({ quizId, onClose }: QuizModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const { quizzes, isLoading } = useQuizzes();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedQuiz = quizzes?.find((q) => q.id === quizId);

  useEffect(() => {
    if (quizId) {
      setCurrentQuestionIndex(0);
      setAnswers({});
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
      setShowHint(false);
    }
  }, [quizId]);

  useEffect(() => {
    // Reset answer check state when changing questions
    setSelectedAnswer(answers[currentQuestionIndex] || null);
    setIsAnswerChecked(false);
    setShowHint(false);
  }, [currentQuestionIndex]);

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
  const allAnswered = questions.every((_: any, idx: number) => answers[idx]);

  const handleAnswerSelect = (option: string) => {
    if (isAnswerChecked) return; // Don't allow changing after checking
    
    setSelectedAnswer(option);
    setIsAnswerChecked(true);
    setAnswers({ ...answers, [currentQuestionIndex]: option });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const getOptionStyle = (option: string) => {
    if (!isAnswerChecked) {
      return selectedAnswer === option ? "default" : "outline";
    }
    
    // After checking answer
    const isCorrect = option === currentQuestion.correctAnswer;
    const isSelected = option === selectedAnswer;
    
    if (isCorrect) {
      return "default"; // Will add green border with className
    }
    if (isSelected && !isCorrect) {
      return "destructive"; // Red for wrong answer
    }
    return "outline";
  };

  const getOptionClassName = (option: string) => {
    if (!isAnswerChecked) {
      return "w-full justify-start text-left";
    }
    
    const isCorrect = option === currentQuestion.correctAnswer;
    const isSelected = option === selectedAnswer;
    
    if (isCorrect) {
      return "w-full justify-start text-left border-2 border-green-500 bg-green-500/10";
    }
    if (isSelected && !isCorrect) {
      return "w-full justify-start text-left border-2 border-destructive";
    }
    return "w-full justify-start text-left opacity-50";
  };

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

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xl font-semibold flex-1">{currentQuestion.question}</p>
              {currentQuestion.hint && (
                <Collapsible open={showHint} onOpenChange={setShowHint}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Hint
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>

            {showHint && currentQuestion.hint && (
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{currentQuestion.hint}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              {currentQuestion.options.map((option: string, optIdx: number) => (
                <Button
                  key={optIdx}
                  variant={getOptionStyle(option)}
                  className={getOptionClassName(option)}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={isAnswerChecked}
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  {option}
                </Button>
              ))}
            </div>

            {isAnswerChecked && (
              <div className={`p-3 rounded-lg ${selectedAnswer === currentQuestion.correctAnswer ? 'bg-green-500/10 border border-green-500' : 'bg-destructive/10 border border-destructive'}`}>
                <p className="text-sm font-medium">
                  {selectedAnswer === currentQuestion.correctAnswer ? '✓ Correct!' : '✗ Not quite'}
                </p>
                {selectedAnswer !== currentQuestion.correctAnswer && currentQuestion.explanation && (
                  <p className="text-sm mt-1 text-muted-foreground">
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>
            )}
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
                onClick={handleNext}
                disabled={!isAnswerChecked}
              >
                Next →
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
