import { Brain, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const loadingStates = [
  { icon: Search, text: "Searching through your sources..." },
  { icon: Brain, text: "Thinking..." },
  { icon: Sparkles, text: "Analyzing content..." },
];

export const LoadingMessage = () => {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentState((prev) => (prev + 1) % loadingStates.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = loadingStates[currentState].icon;

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 animate-pulse">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <CurrentIcon className="w-5 h-5 text-primary animate-spin" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground animate-fade-in">
          {loadingStates[currentState].text}
        </p>
      </div>
    </div>
  );
};
