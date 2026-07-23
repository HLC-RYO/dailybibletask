"use client";

import {
  DataSnapshot,
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
} from "firebase/database";
import { realtimeDb } from "./firebase";
import type {
  ChapterRef,
  MemberId,
  ReadingPresence,
  ReadingPresenceState,
} from "./types";

export const PRESENCE_STALE_MS = 90_000;

export function getLiveReadingPresence(
  presence: ReadingPresenceState,
  now = new Date(),
): ReadingPresenceState {
  const nowMs = now.getTime();
  return Object.fromEntries(
    Object.entries(presence).filter(([, item]) => {
      if (!item) return false;
      return nowMs - new Date(item.updatedAt).getTime() <= PRESENCE_STALE_MS;
    }),
  ) as ReadingPresenceState;
}

export async function publishReadingPresence(input: {
  householdId: string;
  uid: string;
  memberId: MemberId;
  chapterRef: ChapterRef;
  startedAt?: string;
}) {
  if (!realtimeDb) return;
  const presenceRef = ref(
    realtimeDb,
    `presenceHouseholds/${input.householdId}/reading/${input.uid}`,
  );
  const now = new Date().toISOString();
  await onDisconnect(presenceRef).remove();
  await set(presenceRef, {
    uid: input.uid,
    memberId: input.memberId,
    ref: input.chapterRef,
    startedAt: input.startedAt ?? now,
    updatedAt: now,
  } satisfies ReadingPresence);
}

export async function clearReadingPresence(householdId: string, uid: string) {
  if (!realtimeDb) return;
  const presenceRef = ref(realtimeDb, `presenceHouseholds/${householdId}/reading/${uid}`);
  await onDisconnect(presenceRef).cancel();
  await remove(presenceRef);
}

function snapshotToPresence(snapshot: DataSnapshot): ReadingPresenceState {
  const raw = (snapshot.val() ?? {}) as Record<string, ReadingPresence>;
  const byMember: ReadingPresenceState = {};
  for (const item of Object.values(raw)) {
    if (item?.memberId === "husband" || item?.memberId === "wife") {
      byMember[item.memberId] = item;
    }
  }
  return getLiveReadingPresence(byMember);
}

export function subscribeReadingPresence(
  householdId: string,
  callback: (presence: ReadingPresenceState) => void,
) {
  if (!realtimeDb) return () => undefined;
  const readingRef = ref(realtimeDb, `presenceHouseholds/${householdId}/reading`);
  const unsubscribe = onValue(readingRef, (snapshot) => callback(snapshotToPresence(snapshot)));
  const timer = window.setInterval(() => {
    onValue(readingRef, (snapshot) => callback(snapshotToPresence(snapshot)), { onlyOnce: true });
  }, 15_000);
  return () => {
    unsubscribe();
    window.clearInterval(timer);
  };
}
