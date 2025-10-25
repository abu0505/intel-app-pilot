import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Brain, Trophy, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const QuizzesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const { data: quizzes, isLoading } = useQuery({
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
    mutationFn: async (formData: FormData) => {
      const difficulty = formData.get("difficulty") as string;
      const questionCount = parseInt(formData.get("questionCount") as string);

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { difficulty, questionCount },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
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
  });

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
    generateQuizMutation.mutate(formData);
  };

  if (selectedQuiz) {
    const questions = selectedQuiz.questions;
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const allAnswered = questions.every((_: any, idx: number) => answers[idx]);
    
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="outline" onClick={() => { setSelectedQuiz(null); setAnswers({}); setCurrentQuestionIndex(0); }}>
          ← Back to Quizzes
        </Button>

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
          quizzes?.map((quiz) => (
            <Card
              key={quiz.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedQuiz(quiz)}
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <CardHeader>
                <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{quiz.difficulty_level}</Badge>
                  <Badge variant="outline">{quiz.question_count} questions</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(quiz.created_at).toLocaleDateString()}
                </p>
                {quiz.times_taken > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Avg. Score: {quiz.average_score_percentage.toFixed(0)}%
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default QuizzesTab;
