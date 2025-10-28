import { useState, useEffect, useCallback, useRef } from "react";

interface UseSidebarStateReturn {
  isExpanded: boolean;
  isPinned: boolean;
  setExpanded: (expanded: boolean) => void;
  setPinned: (pinned: boolean) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  togglePin: () => void;
}

const STORAGE_KEY = "sidebar-pinned-state";

export function useSidebarState(): UseSidebarStateReturn {
  // Load pinned state from localStorage
  const [isPinned, setIsPinnedState] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(isPinned);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Persist pinned state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isPinned.toString());
  }, [isPinned]);

  // If pinned, keep expanded
  useEffect(() => {
    if (isPinned) {
      setIsExpanded(true);
    }
  }, [isPinned]);

  const handleMouseEnter = useCallback(() => {
    // Clear any pending collapse timer
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setIsExpanded(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Only collapse if not pinned
    if (!isPinned) {
      // Delay collapse by 200ms
      collapseTimerRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, 200);
    }
  }, [isPinned]);

  const togglePin = useCallback(() => {
    setIsPinnedState((prev) => !prev);
  }, []);

  const setPinned = useCallback((pinned: boolean) => {
    setIsPinnedState(pinned);
  }, []);

  const setExpanded = useCallback((expanded: boolean) => {
    if (!isPinned) {
      setIsExpanded(expanded);
    }
  }, [isPinned]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  return {
    isExpanded,
    isPinned,
    setExpanded,
    setPinned,
    handleMouseEnter,
    handleMouseLeave,
    togglePin,
  };
}
