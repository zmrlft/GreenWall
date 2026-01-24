import { useState, useRef, useCallback } from 'react';

export function useContributionHistory(initialMap: Map<string, number>) {
  const [userContributions, setUserContributions] = useState<Map<string, number>>(initialMap);

  // Use refs for history stacks to avoid re-renders when history changes
  const historyRef = useRef<Map<string, number>[]>([]);
  const futureRef = useRef<Map<string, number>[]>([]);

  // Push current state to history before making a change
  const pushSnapshot = useCallback(() => {
    // Clone the current map to save its state
    historyRef.current.push(new Map(userContributions));
    // Clear redo stack because we branched off
    futureRef.current = [];
  }, [userContributions]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;

    const previousState = historyRef.current.pop();
    if (previousState) {
      // Save current state to future before restoring past
      futureRef.current.push(new Map(userContributions));
      setUserContributions(previousState);
    }
  }, [userContributions]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    const nextState = futureRef.current.pop();
    if (nextState) {
      // Save current state to history before restoring future
      historyRef.current.push(new Map(userContributions));
      setUserContributions(nextState);
    }
  }, [userContributions]);

  return {
    userContributions,
    setUserContributions,
    pushSnapshot,
    undo,
    redo,
  };
}
