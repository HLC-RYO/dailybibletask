"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { subscribeReadingPresence } from "@/lib/presence";
import type { ReadingPresenceState } from "@/lib/types";

export function useReadingPresence() {
  const { household } = useAppContext();
  const [presence, setPresence] = useState<ReadingPresenceState>({});

  useEffect(() => {
    if (!household) return;
    return subscribeReadingPresence(household.id, setPresence);
  }, [household]);

  return presence;
}
