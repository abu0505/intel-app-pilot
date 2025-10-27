import { useState } from "react";
import { StudyActions } from "@/components/dashboard/StudyActions";
import QuizzesTab from "@/components/dashboard/QuizzesTab";
import FlashcardsTab from "@/components/dashboard/FlashcardsTab";

type StudyView = "grid" | "quiz" | "flashcards";

type StudyTabProps = {
  defaultView?: StudyView;
};

const StudyTab = ({ defaultView = "grid" }: StudyTabProps) => {
  const [view, setView] = useState<StudyView>(defaultView);
  const [selectedFlashcardId, setSelectedFlashcardId] = useState<string | undefined>();
  const [selectedQuizId, setSelectedQuizId] = useState<string | undefined>();

  if (view === "quiz") {
    return (
      <QuizzesTab
        onBackToStudio={() => {
          setView("grid");
          setSelectedQuizId(undefined);
        }}
        initialQuizId={selectedQuizId}
      />
    );
  }

  if (view === "flashcards") {
    return (
      <FlashcardsTab
        onBackToStudio={() => {
          setView("grid");
          setSelectedFlashcardId(undefined);
        }}
        initialFlashcardId={selectedFlashcardId}
      />
    );
  }

  return (
    <StudyActions
      onOpenFlashcards={(flashcardId) => {
        setSelectedFlashcardId(flashcardId);
        setView("flashcards");
      }}
      onOpenQuiz={(quizId) => {
        setSelectedQuizId(quizId);
        setView("quiz");
      }}
    />
  );
};

export default StudyTab;
