import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Brain, Trophy, ChevronRight, Sparkles, Layers, History, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuizzes } from "@/hooks/use-quizzes";

type QuizzesTabProps = {
  onBackToStudio?: () => void;
  initialQuizId?: string;
};

const QuizzesTab = ({ onBackToStudio, initialQuizId }: QuizzesTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const { quizzes, isLoading, generateQuizMutation } = useQuizzes();

  useEffect(() => {
    if (!initialQuizId || !quizzes?.length) return;
    if (selectedQuiz?.id === initialQuizId) return;

    const match = quizzes.find((quiz) => quiz.id === initialQuizId);
    if (match) {
      setSelectedQuiz(match);
      setCurrentQuestionIndex(0);
      setAnswers({});
    }
  }, [initialQuizId, quizzes, selectedQuiz?.id]);

  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuiz) return;

      const questions = selectedQuiz.questions;
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
      setSelectedQuiz(null);
      setAnswers({});
    },
  });

  const handleGenerateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const difficulty = (formData.get("difficulty") as "easy" | "medium" | "hard") ?? "medium";
    const questionCount = parseInt((formData.get("questionCount") as string) ?? "10", 10);

    generateQuizMutation.mutate(
      { difficulty, questionCount },
      {
        onSuccess: () => {
          toast({
            title: "Quiz generated!",
            description: "Your personalized quiz is ready.",
          });
          setShowGenerateForm(false);
        },
        onError: (error: Error) => {
          toast({
            variant: "destructive",
            title: "Failed to generate quiz",
            description: error.message,
          });
        },
      },
    );
  };

  if (selectedQuiz) {
    const questions = selectedQuiz.questions;
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const allAnswered = questions.every((_: any, idx: number) => answers[idx]);

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="hover:text-black hover:bg-primary/10 dark:text-primary-foreground dark:hover:text-primary-foreground dark:hover:bg-primary/20"
            onClick={() => {
              setSelectedQuiz(null);
              setAnswers({});
              setCurrentQuestionIndex(0);
              onBackToStudio?.();
            }}
          >
            ← Back to Studio
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedQuiz.title}</CardTitle>
            <CardDescription>
              Question {currentQuestionIndex + 1} of {questions.length} · {selectedQuiz.difficulty_level}
            </CardDescription>
            <div className="w-full bg-secondary h-2 rounded-full mt-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-xl font-semibold">
                {currentQuestion.question}
              </p>
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
                  onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onBackToStudio && (
        <Button variant="ghost" className="px-0" onClick={() => onBackToStudio()}>
          ← Back to Studio
        </Button>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Your Quizzes</h2>
          <p className="text-muted-foreground mt-1">Test your knowledge with AI-generated quizzes</p>
        </div>
        <Button onClick={() => setShowGenerateForm(!showGenerateForm)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Generate Quiz
        </Button>
      </div>

      {showGenerateForm && (
        <Card style={{ boxShadow: "var(--shadow-medium)" }}>
          <CardHeader>
            <CardTitle>Generate New Quiz</CardTitle>
            <CardDescription>Create a personalized quiz from your sources</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select name="difficulty" defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionCount">Number of Questions</Label>
                <Input
                  id="questionCount"
                  name="questionCount"
                  type="number"
                  min="5"
                  max="20"
                  defaultValue="10"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={generateQuizMutation.isPending}>
                  {generateQuizMutation.isPending ? "Generating..." : "Generate Quiz"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowGenerateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
            </Card>
          ))
        ) : quizzes?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No quizzes yet. Generate your first quiz to test your knowledge!
              </p>
            </CardContent>
          </Card>
        ) : (
          quizzes?.map((quiz) => {
            const hasStats =
              quiz.times_taken > 0 && Number.isFinite(quiz.average_score_percentage);

            return (
              <Card
                key={quiz.id}
                className="group relative cursor-pointer overflow-hidden border border-border/60 bg-background/80 shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl"
                onClick={() => setSelectedQuiz(quiz)}
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-12 rounded-full bg-primary/20 blur-3xl" />

                <CardHeader className="relative z-10 space-y-4 pb-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/15 p-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold leading-tight line-clamp-2">{quiz.title}</CardTitle>
                        <CardDescription className="text-sm">AI generated quiz</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full border-border/40 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                      {quiz.difficulty_level}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Created {new Date(quiz.created_at).toLocaleDateString()}</p>
                </CardHeader>

                <CardContent className="relative z-10 space-y-4 pt-0">
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/80 px-3 py-3 backdrop-blur-sm">
                      <div className="rounded-lg bg-primary/15 p-2 text-primary">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Questions</p>
                        <p className="text-base font-semibold">{quiz.question_count}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/80 px-3 py-3 backdrop-blur-sm">
                      <div className="rounded-lg bg-primary/15 p-2 text-primary">
                        <History className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Attempts</p>
                        <p className="text-base font-semibold">{quiz.times_taken ?? 0}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/80 px-3 py-3 backdrop-blur-sm">
                      <div className="rounded-lg bg-primary/15 p-2 text-primary">
                        <Target className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg. Score</p>
                        <p className="text-base font-semibold">{hasStats ? `${quiz.average_score_percentage.toFixed(0)}%` : "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <span>Tap to open</span>
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      Start quiz
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default QuizzesTab;
