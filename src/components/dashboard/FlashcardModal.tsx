import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, RotateCcw } from "lucide-react";
import { useFlashcards } from "@/hooks/use-flashcards";
import { Skeleton } from "@/components/ui/skeleton";

type FlashcardModalProps = {
  flashcardId: string | null;
  onClose: () => void;
};

export function FlashcardModal({ flashcardId, onClose }: FlashcardModalProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const { flashcards, isLoading } = useFlashcards();

  const selectedFlashcard = flashcards?.find((f) => f.id === flashcardId);

  useEffect(() => {
    if (flashcardId) {
      setCurrentCardIndex(0);
      setIsFlipped(false);
    }
  }, [flashcardId]);

  const handleNextCard = () => {
    if (selectedFlashcard && currentCardIndex < selectedFlashcard.cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  if (!flashcardId) return null;

  if (isLoading) {
    return (
      <Dialog open={!!flashcardId} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!selectedFlashcard) return null;

  const currentCard = selectedFlashcard.cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / selectedFlashcard.cards.length) * 100;

  return (
    <Dialog open={!!flashcardId} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{selectedFlashcard.title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-muted-foreground">
                  Card {currentCardIndex + 1} of {selectedFlashcard.cards.length}
                </p>
                <Badge variant="secondary">{currentCard.category}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentCardIndex(0)}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="w-full bg-secondary h-2 rounded-full">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div
            className="min-h-[300px] flex items-center justify-center p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <p className="text-2xl font-semibold text-center">
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handlePrevCard} disabled={currentCardIndex === 0}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <Button variant="ghost" onClick={() => setIsFlipped(!isFlipped)}>
              {isFlipped ? "Show Question" : "Show Answer"}
            </Button>

            <Button
              variant="outline"
              onClick={handleNextCard}
              disabled={currentCardIndex === selectedFlashcard.cards.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Difficulty:</span>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < currentCard.difficulty * 5 ? "bg-primary" : "bg-secondary"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
