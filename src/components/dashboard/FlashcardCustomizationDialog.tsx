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
import { useFlashcards, DEFAULT_FLASHCARD_OPTIONS } from "@/hooks/use-flashcards";

const CARD_COUNT_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "Fewer", value: 8 },
  { label: "Standard", value: DEFAULT_FLASHCARD_OPTIONS.cardCount },
  { label: "More", value: 25 },
];

const DIFFICULTY_OPTIONS: Array<{ label: string; value: "easy" | "medium" | "hard" }> = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" },
];

const HINTS = `Things to try:
• Restrict flashcards to a specific source (e.g. "Physics Chapter 2")
• Focus on one topic or chapter
• Keep card fronts concise for quick recall`;

type FlashcardCustomizationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function FlashcardCustomizationDialog({ open, onOpenChange, onSuccess }: FlashcardCustomizationDialogProps) {
  const { generateFlashcardsMutation, sources } = useFlashcards();
  const { toast } = useToast();
  const [cardCount, setCardCount] = useState<number>(DEFAULT_FLASHCARD_OPTIONS.cardCount);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(DEFAULT_FLASHCARD_OPTIONS.difficulty);
  const [topic, setTopic] = useState("");

  const handleGenerate = () => {
    generateFlashcardsMutation.mutate(
      { cardCount, difficulty, topic },
      {
        onSuccess: () => {
          toast({ title: "Flashcards are being generated" });
          onSuccess?.();
          onOpenChange(false);
        },
        onError: (error: Error) => {
          toast({ title: "Unable to generate flashcards", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl space-y-6">
        <DialogHeader className="space-y-3">
          <DialogTitle>Customize Flashcards</DialogTitle>
          <DialogDescription>Adjust card count, difficulty, and the focus area for your flashcards.</DialogDescription>
        </DialogHeader>

        <section className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Number of Cards</p>
          <ToggleGroup
            type="single"
            value={String(cardCount)}
            onValueChange={(value) => value && setCardCount(Number(value))}
            className="gap-3"
          >
            {CARD_COUNT_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={String(option.value)}
                className="px-5 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {option.label}
                {option.value === DEFAULT_FLASHCARD_OPTIONS.cardCount && (
                  <span className="ml-1 text-xs text-muted-foreground">(Default)</span>
                )}
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
                {option.value === DEFAULT_FLASHCARD_OPTIONS.difficulty && (
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
          <Button onClick={handleGenerate} disabled={generateFlashcardsMutation.isPending || !sources?.length}>
            {generateFlashcardsMutation.isPending ? "Generating..." : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
