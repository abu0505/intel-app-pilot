import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Brain, Trophy, ChevronRight, Sparkles, Layers, History, Target, Volume2, Lightbulb, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuizzes } from "@/hooks/use-quizzes";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { supabase } from "@/integrations/supabase/client";

type QuizzesTabProps = {
  notebookId?: string;
  onBackToStudio?: () => void;
  initialQuizId?: string;
};

const QuizzesTab = ({ notebookId, onBackToStudio, initialQuizId }: QuizzesTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showReview, setShowReview] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState<Record<number, boolean>>({});
  const { speak, stop, isSpeaking } = useTextToSpeech();

  const { quizzes, isLoading, generateQuizMutation } = useQuizzes(notebookId);

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
      const results: any[] = [];

      questions.forEach((q: any, idx: number) => {
        const isCorrect = answers[idx] === q.correctAnswer;
        if (isCorrect) correct++;
        results.push({
          question: q.question,
          userAnswer: answers[idx],
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation || "No explanation available"
        });
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
      return { scorePercentage, correct, total: questions.length, results };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      setQuizResult(result);
      setShowReview(true);
    },
  });

  const getHintCount = () => {
    const questionCount = selectedQuiz?.questions.length || 10;
    const difficulty = selectedQuiz?.difficulty_level || "medium";
    
    if (questionCount <= 5) {
      return difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
    } else if (questionCount <= 10) {
      return difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 4;
    }
    return difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;
  };

  const generateHint = (question: any) => {
    const hints = [
      `This question is about ${question.category || 'the topic'}`,
      `Consider the key concepts related to this question`,
      `Think about what you learned in your sources`,
      `The answer is one of the options provided - eliminate the obviously wrong ones`,
    ];
    return hints[Object.keys(hintsUsed).length % hints.length];
  };

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

  if (showReview && quizResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              setShowReview(false);
              setQuizResult(null);
              setSelectedQuiz(null);
              setAnswers({});
              setCurrentQuestionIndex(0);
              setHintsUsed({});
            }}
          >
            ← Back to Quizzes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quiz Results</CardTitle>
            <CardDescription>
              Score: {quizResult.scorePercentage.toFixed(0)}% ({quizResult.correct}/{quizResult.total})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quizResult.results.map((result: any, idx: number) => (
              <Card key={idx} className={result.isCorrect ? "border-green-500/50" : "border-red-500/50"}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {result.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mt-1" />
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-base">{result.question}</CardTitle>
                      <div className="mt-3 space-y-2 text-sm">
                        <div>
                          <span className="font-semibold">Your answer: </span>
                          <span className={result.isCorrect ? "text-green-600" : "text-red-600"}>
                            {result.userAnswer || "Not answered"}
                          </span>
                        </div>
                        {!result.isCorrect && (
                          <div>
                            <span className="font-semibold">Correct answer: </span>
                            <span className="text-green-600">{result.correctAnswer}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t">
                          <span className="font-semibold">Explanation: </span>
                          <p className="text-muted-foreground mt-1">{result.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedQuiz) {
    const questions = selectedQuiz.questions;
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const allAnswered = questions.every((_: any, idx: number) => answers[idx]);
    const maxHints = getHintCount();
    const hintsRemaining = maxHints - Object.keys(hintsUsed).length;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="hover:text-black hover:bg-primary/10 dark:text-primary-foreground dark:hover:text-primary-foreground dark:hover:bg-primary/20"
            onClick={() => {
              stop();
              setSelectedQuiz(null);
              setAnswers({});
              setCurrentQuestionIndex(0);
              setHintsUsed({});
              setShowHint(false);
              onBackToStudio?.();
            }}
          >
            ← Back to Studio
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle>{selectedQuiz.title}</CardTitle>
                <CardDescription>
                  Question {currentQuestionIndex + 1} of {questions.length} · {selectedQuiz.difficulty_level}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => speak(currentQuestion.question)}
                  disabled={isSpeaking}
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
                {hintsRemaining > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowHint(true);
                      setHintsUsed({ ...hintsUsed, [currentQuestionIndex]: true });
                    }}
                    disabled={hintsUsed[currentQuestionIndex]}
                  >
                    <Lightbulb className="w-4 h-4 mr-1" />
                    Hint ({hintsRemaining})
                  </Button>
                )}
              </div>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full mt-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {showHint && hintsUsed[currentQuestionIndex] && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-primary mt-0.5" />
                  <p className="text-sm">{generateHint(currentQuestion)}</p>
                </div>
              </div>
            )}
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
                className="group relative overflow-hidden border border-border/60 bg-background/80 shadow-sm transition-all hover:-translate-y-1 hover:shadow-2xl"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-12 rounded-full bg-primary/20 blur-3xl" />

                <CardHeader className="relative z-10 space-y-4 pb-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setSelectedQuiz(quiz)}>
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

                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground cursor-pointer" onClick={() => setSelectedQuiz(quiz)}>
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
