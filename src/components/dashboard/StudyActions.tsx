import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { QuizCustomizationDialog } from "@/components/dashboard/QuizCustomizationDialog";
import { FlashcardCustomizationDialog } from "@/components/dashboard/FlashcardCustomizationDialog";
import { useQuizzes } from "@/hooks/use-quizzes";
import { useFlashcards } from "@/hooks/use-flashcards";
import { Loader2, Pencil, Sparkles, Layers, BookOpen, Brain, MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const ACTION_CARDS = [
  {
    id: "flashcards",
    title: "Flashcards",
    description: "Generate study flashcards tailored to your sources.",
    accent: "from-pink-500/40 to-pink-700/30",
  },
  {
    id: "quizzes",
    title: "Quiz",
    description: "Test yourself instantly with AI-generated quizzes.",
    accent: "from-sky-500/40 to-sky-700/30",
  },
];

export function StudyActions({
  onOpenFlashcards,
  onOpenQuiz,
}: {
  onOpenFlashcards?: (flashcardId?: string) => void;
  onOpenQuiz?: (quizId?: string) => void;
}) {
  const { toast } = useToast();
  const {
    generateQuizMutation,
    quizzes,
    isLoading: isQuizzesLoading,
    renameQuizMutation,
    deleteQuizMutation,
  } = useQuizzes();
  const {
    generateFlashcardsMutation,
    sources,
    flashcards,
    isLoading: isFlashcardsLoading,
    renameFlashcardsMutation,
    deleteFlashcardsMutation,
  } = useFlashcards();

  const [isQuizDialogOpen, setQuizDialogOpen] = useState(false);
  const [isFlashcardDialogOpen, setFlashcardDialogOpen] = useState(false);
  const [flashcardToRename, setFlashcardToRename] = useState<{ id: string; title: string } | null>(null);
  const [quizToRename, setQuizToRename] = useState<{ id: string; title: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const closeRenameDialog = () => {
    setFlashcardToRename(null);
    setQuizToRename(null);
    setRenameValue("");
  };

  const handleRenameSubmit = () => {
    if (flashcardToRename) {
      renameFlashcardsMutation.mutate(
        { id: flashcardToRename.id, title: renameValue },
        {
          onSuccess: () => {
            toast({ title: "Flashcard renamed" });
            closeRenameDialog();
          },
          onError: (error: Error) => {
            toast({ title: "Unable to rename", description: error.message, variant: "destructive" });
          },
        },
      );
    } else if (quizToRename) {
      renameQuizMutation.mutate(
        { id: quizToRename.id, title: renameValue },
        {
          onSuccess: () => {
            toast({ title: "Quiz renamed" });
            closeRenameDialog();
          },
          onError: (error: Error) => {
            toast({ title: "Unable to rename", description: error.message, variant: "destructive" });
          },
        },
      );
    }
  };

  const handleDeleteFlashcard = (id: string) => {
    deleteFlashcardsMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: "Flashcard deleted" });
      },
      onError: (error: Error) => {
        toast({ title: "Unable to delete", description: error.message, variant: "destructive" });
      },
    });
  };

  const handleDeleteQuiz = (id: string) => {
    deleteQuizMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: "Quiz deleted" });
      },
      onError: (error: Error) => {
        toast({ title: "Unable to delete", description: error.message, variant: "destructive" });
      },
    });
  };

  const defaultSourceIds = sources?.map((source: any) => source.id) ?? [];

  const handlePrimaryAction = (id: string) => {
    if (id === "quizzes") {
      generateQuizMutation.mutate(
        {},
        {
          onSuccess: () => {
            toast({ title: "Quiz is being prepared" });
            onOpenQuiz?.();
          },
          onError: (error: Error) => {
            toast({ title: "Unable to generate quiz", description: error.message, variant: "destructive" });
          },
        },
      );
    } else if (id === "flashcards") {
      if (!sources?.length) {
        toast({ title: "No sources available", description: "Upload sources before generating flashcards." });
        return;
      }

      generateFlashcardsMutation.mutate(
        { sourceIds: defaultSourceIds },
        {
          onSuccess: () => {
            toast({ title: "Flashcards are being generated" });
            onOpenFlashcards?.();
          },
          onError: (error: Error) => {
            toast({ title: "Unable to generate flashcards", description: error.message, variant: "destructive" });
          },
        },
      );
    }
  };

  const handleCustomize = (id: string) => {
    if (id === "quizzes") {
      setQuizDialogOpen(true);
    } else if (id === "flashcards") {
      setFlashcardDialogOpen(true);
    }
  };

  const isGenerating = generateQuizMutation.isPending || generateFlashcardsMutation.isPending;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-primary/10 p-6 shadow-inner">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Badge variant="outline" className="text-primary">
              Studio
            </Badge>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              Build your study session
              <Sparkles className="h-5 w-5 text-primary" />
            </h2>
            <p className="text-sm text-muted-foreground">
              Pick a study tool to generate in seconds. Customize with AI or jump right in.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            Powered by your uploaded sources
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ACTION_CARDS.map((card) => {
          const isQuiz = card.id === "quizzes";
          const isPending = isQuiz ? generateQuizMutation.isPending : generateFlashcardsMutation.isPending;
          return (
            <Card
              key={card.id}
              className={`relative overflow-hidden border-0 shadow-lg transition hover:shadow-xl bg-gradient-to-br ${card.accent} text-slate-900 dark:text-white`}
            >
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-semibold drop-shadow-sm dark:text-white text-slate-900">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground dark:text-white/80 text-sm max-w-sm">
                    {card.description}
                  </CardDescription>
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full bg-background/70 text-foreground dark:bg-white/20 dark:text-white"
                  onClick={() => handleCustomize(card.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <Button
                  variant="default"
                  className="bg-foreground text-background hover:bg-foreground/90 dark:bg-white/90 dark:text-slate-900"
                  onClick={() => handlePrimaryAction(card.id)}
                  disabled={isPending || (card.id === "flashcards" && !sources?.length)}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Flashcard Sets</h3>
          {onOpenFlashcards && (flashcards?.length ?? 0) > 0 && (
            <Button variant="link" className="px-0" onClick={() => onOpenFlashcards()}>
              View all
            </Button>
          )}
        </div>
        {isFlashcardsLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : flashcards && flashcards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {flashcards.slice(0, 4).map((flashcard) => (
              <Card
                key={flashcard.id}
                className={`group relative overflow-hidden border-border/60 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm transition-all hover:shadow-xl ${onOpenFlashcards ? "cursor-pointer" : ""}`}
                onClick={onOpenFlashcards ? () => onOpenFlashcards(flashcard.id) : undefined}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                
                <CardHeader className="relative z-10 space-y-3 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/15 p-2.5 text-primary">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <CardTitle className="line-clamp-2 text-base font-semibold leading-tight">{flashcard.title}</CardTitle>
                        <CardDescription className="text-xs">{flashcard.card_count} cards</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            setFlashcardToRename({ id: flashcard.id, title: flashcard.title });
                            setRenameValue(flashcard.title);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Edit3 className="h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteFlashcard(flashcard.id);
                          }}
                          className="flex items-center gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="relative z-10 pt-0" />
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No flashcards yet. Generate a set to see it here.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Quizzes</h3>
          {onOpenQuiz && (quizzes?.length ?? 0) > 0 && (
            <Button variant="link" className="px-0" onClick={() => onOpenQuiz()}>
              View all
            </Button>
          )}
        </div>
        {isQuizzesLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : quizzes && quizzes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {quizzes.slice(0, 4).map((quiz) => (
              <Card
                key={quiz.id}
                className={`group relative overflow-hidden border-border/60 bg-gradient-to-br from-background via-background to-primary/5 shadow-sm transition-all hover:shadow-xl ${onOpenQuiz ? "cursor-pointer" : ""}`}
                onClick={onOpenQuiz ? () => onOpenQuiz(quiz.id) : undefined}
              >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                  
                  <CardHeader className="relative z-10 space-y-3 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/15 p-2.5 text-primary">
                          <Brain className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <CardTitle className="line-clamp-2 text-base font-semibold leading-tight">{quiz.title}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-medium uppercase">
                              {quiz.difficulty_level}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{quiz.question_count} questions</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-44"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            setQuizToRename({ id: quiz.id, title: quiz.title });
                            setRenameValue(quiz.title);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Edit3 className="h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteQuiz(quiz.id);
                          }}
                          className="flex items-center gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative z-10 pt-0" />
                </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No quizzes yet. Generate one to see it here.
            </CardContent>
          </Card>
        )}
      </section>

      <QuizCustomizationDialog
        open={isQuizDialogOpen}
        onOpenChange={setQuizDialogOpen}
      />
      <FlashcardCustomizationDialog
        open={isFlashcardDialogOpen}
        onOpenChange={setFlashcardDialogOpen}
      />

      <Dialog open={!!flashcardToRename || !!quizToRename} onOpenChange={(open) => !open && closeRenameDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{flashcardToRename ? "Rename flashcard set" : "Rename quiz"}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            placeholder="Enter a new title"
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeRenameDialog}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={renameFlashcardsMutation.isPending || renameQuizMutation.isPending}>
              {(renameFlashcardsMutation.isPending || renameQuizMutation.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
