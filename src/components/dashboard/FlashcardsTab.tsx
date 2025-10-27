import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Brain, Plus, ChevronLeft, ChevronRight, RotateCcw, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardSet, useFlashcards } from "@/hooks/use-flashcards";

type FlashcardsTabProps = {
  onBackToStudio?: () => void;
  initialFlashcardId?: string;
};

export default function FlashcardsTab({ onBackToStudio, initialFlashcardId }: FlashcardsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [cardCount, setCardCount] = useState(15);
  const [selectedFlashcard, setSelectedFlashcard] = useState<FlashcardSet | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const { toast } = useToast();

  const {
    flashcards,
    isLoading,
    sources,
    generateFlashcardsMutation,
    deleteFlashcardsMutation,
  } = useFlashcards();

  useEffect(() => {
    if (!initialFlashcardId || !flashcards?.length) return;
    if (selectedFlashcard?.id === initialFlashcardId) return;

    const match = flashcards.find((flashcard) => flashcard.id === initialFlashcardId);
    if (match) {
      setSelectedFlashcard(match);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    }
  }, [initialFlashcardId, flashcards, selectedFlashcard?.id]);

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

  if (selectedFlashcard) {
    const currentCard = selectedFlashcard.cards[currentCardIndex];
    const progress = ((currentCardIndex + 1) / selectedFlashcard.cards.length) * 100;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="hover:text-black hover:bg-primary/10 dark:text-primary-foreground dark:hover:text-primary-foreground dark:hover:bg-primary/20"
            onClick={() => {
              setSelectedFlashcard(null);
              setCurrentCardIndex(0);
              setIsFlipped(false);
              onBackToStudio?.();
            }}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Studio
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentCardIndex(0)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                deleteFlashcardsMutation.mutate(selectedFlashcard.id, {
                  onSuccess: () => {
                    setSelectedFlashcard(null);
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                    toast({ title: "Flashcard set deleted" });
                  },
                  onError: (error: Error) => {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  },
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedFlashcard.title}</CardTitle>
            <div className="flex items-center justify-between">
              <CardDescription>
                Card {currentCardIndex + 1} of {selectedFlashcard.cards.length}
              </CardDescription>
              <Badge variant="secondary">{currentCard.category}</Badge>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full mt-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              className="min-h-[300px] flex items-center justify-center p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <p className="text-2xl font-semibold text-center">
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevCard}
                disabled={currentCardIndex === 0}
              >
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
          <h2 className="text-2xl font-bold">Flashcards</h2>
          <p className="text-muted-foreground">Generate and study flashcards from your sources</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Flashcard Set
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Flashcards</CardTitle>
            <CardDescription>Create flashcards from your uploaded sources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cardCount">Number of Cards</Label>
              <Input
                id="cardCount"
                type="number"
                min="5"
                max="50"
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  generateFlashcardsMutation.mutate(
                    { cardCount },
                    {
                      onSuccess: () => {
                        setShowForm(false);
                        toast({ title: "Flashcards generated successfully!" });
                      },
                      onError: (error: Error) => {
                        toast({ title: "Error", description: error.message, variant: "destructive" });
                      },
                    },
                  )
                }
                disabled={generateFlashcardsMutation.isPending || !sources?.length}
              >
                {generateFlashcardsMutation.isPending ? "Generating..." : "Generate Flashcards"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !flashcards || flashcards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Brain className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">No flashcards yet</p>
            <p className="text-muted-foreground mb-4">Generate your first set to start studying</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {flashcards.map((flashcard) => (
            <Card
              key={flashcard.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedFlashcard(flashcard)}
            >
              <CardHeader>
                <CardTitle>{flashcard.title}</CardTitle>
                <CardDescription>{flashcard.card_count} cards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Studied: {flashcard.times_studied} times</span>
                  {flashcard.times_studied > 0 && (
                    <span>Retention: {flashcard.average_retention_percentage.toFixed(0)}%</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
