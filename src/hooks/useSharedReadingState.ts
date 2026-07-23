"use client";

import { doc, onSnapshot, runTransaction, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { defaultReadingState, normalizeReadingState } from "@/lib/defaults";
import { db } from "@/lib/firebase";
import type { ReadingState } from "@/lib/types";

export type ReadingStateUpdater = ReadingState | ((current: ReadingState) => ReadingState);

export function useSharedReadingState() {
  const { household } = useAppContext();
  const [state, setStateLocal] = useState<ReadingState>(defaultReadingState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !household) return;
    const readingRef = doc(db, "households", household.id, "app", "reading");
    return onSnapshot(readingRef, async (snapshot) => {
      if (!snapshot.exists()) {
        await setDoc(readingRef, defaultReadingState);
        setStateLocal(defaultReadingState);
      } else {
        setStateLocal(normalizeReadingState(snapshot.data() as Partial<ReadingState>));
      }
      setLoading(false);
    });
  }, [household]);

  const updateState = useCallback(
    async (updater: ReadingStateUpdater) => {
      if (!db || !household) return;
      const readingRef = doc(db, "households", household.id, "app", "reading");
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(readingRef);
        const current = snapshot.exists()
          ? normalizeReadingState(snapshot.data() as Partial<ReadingState>)
          : defaultReadingState;
        const next = typeof updater === "function" ? updater(current) : updater;
        transaction.set(readingRef, normalizeReadingState(next));
      });
    },
    [household],
  );

  return [state, updateState, loading] as const;
}
