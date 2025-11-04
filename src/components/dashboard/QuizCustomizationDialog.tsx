import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuizzes, DEFAULT_QUIZ_OPTIONS } from "@/hooks/use-quizzes";
import { useDashboard } from "@/contexts/DashboardContext";

const QUESTION_COUNT_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "Fewer", value: 5 },
  { label: "Standard", value: DEFAULT_QUIZ_OPTIONS.questionCount },
  { label: "More", value: 15 },
];

const DIFFICULTY_OPTIONS: Array<{ label: string; value: "easy" | "medium" | "hard" }> = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" },
];

const HINTS = `Things to try:
• Restrict the quiz to a specific source (e.g. "Chapter 4 notes")
• Focus solely on key concepts (e.g. "Newton's laws of motion")
• Ask for help preparing for a specific test`;

type QuizCustomizationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function QuizCustomizationDialog({ open, onOpenChange, onSuccess }: QuizCustomizationDialogProps) {
  const { generateQuizMutation } = useQuizzes();
  const { selectedSourceIds } = useDashboard();
  const { toast } = useToast();
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUIZ_OPTIONS.questionCount);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(DEFAULT_QUIZ_OPTIONS.difficulty);
  const [topic, setTopic] = useState("");

  const handleGenerate = () => {
    generateQuizMutation.mutate(
      { 
        questionCount, 
        difficulty, 
        topic,
        sourceIds: selectedSourceIds.length > 0 ? selectedSourceIds : undefined
      },
      {
        onSuccess: () => {
          toast({ title: "Quiz is being generated" });
          onSuccess?.();
          onOpenChange(false);
        },
        onError: (error: Error) => {
          toast({ title: "Unable to generate quiz", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl space-y-6">
        <DialogHeader className="space-y-3">
          <DialogTitle>Customize Quiz</DialogTitle>
          <DialogDescription>Adjust the number of questions, difficulty, and focus for your quiz.</DialogDescription>
        </DialogHeader>

        <section className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Number of Questions</p>
          <ToggleGroup
            type="single"
            value={String(questionCount)}
            onValueChange={(value) => value && setQuestionCount(Number(value))}
            className="gap-3"
          >
            {QUESTION_COUNT_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={String(option.value)}
                className="px-5 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {option.label}
                {option.value === DEFAULT_QUIZ_OPTIONS.questionCount && <span className="ml-1 text-xs text-muted-foreground">(Default)</span>}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Level of Difficulty</p>
          <ToggleGroup
            type="single"
            value={difficulty}
            onValueChange={(value) => value && setDifficulty(value as "easy" | "medium" | "hard")}
            className="gap-3"
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="px-5 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {option.label}
                {option.value === DEFAULT_QUIZ_OPTIONS.difficulty && (
                  <span className="ml-1 text-xs text-muted-foreground">(Default)</span>
                )}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">What should the topic be?</p>
          <Textarea
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder={HINTS}
            rows={5}
          />
        </section>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generateQuizMutation.isPending}>
            {generateQuizMutation.isPending ? "Generating..." : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
