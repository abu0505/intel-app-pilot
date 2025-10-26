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

  if (view === "quiz") {
    return <QuizzesTab onBackToStudio={() => setView("grid")} />;
  }

  if (view === "flashcards") {
    return <FlashcardsTab onBackToStudio={() => setView("grid")} />;
  }

  return (
    <StudyActions
      onOpenFlashcards={() => setView("flashcards")}
      onOpenQuiz={() => setView("quiz")}
    />
  );
};

export default StudyTab;
