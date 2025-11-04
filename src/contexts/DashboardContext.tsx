import { createContext, useContext, useState, ReactNode } from "react";

type View = "chat" | "studio";

interface DashboardContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
  sessionId: string;
  setSessionId: (id: string) => void;
  createNewSession: () => void;
  selectedSourceIds: string[];
  setSelectedSourceIds: (ids: string[]) => void;
  toggleSourceSelection: (id: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<View>("chat");
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);

  const createNewSession = () => {
    setSessionId(crypto.randomUUID());
    setCurrentView("chat");
  };

  const toggleSourceSelection = (id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  return (
    <DashboardContext.Provider
      value={{
        currentView,
        setCurrentView,
        sessionId,
        setSessionId,
        createNewSession,
        selectedSourceIds,
        setSelectedSourceIds,
        toggleSourceSelection,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
