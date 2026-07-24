import type { CompanionProfile, ReadingState } from "./types";

export const defaultCompanionProfile: CompanionProfile = {
  name: "ルカ",
};

export const defaultReadingState: ReadingState = {
  members: {
    husband: {
      normalNext: { bookId: "act", chapter: 11 },
      completedMeetingKeys: [],
      history: [],
      completedChapterKeys: [],
      shareReadingPresence: true,
    },
    wife: {
      normalNext: { bookId: "act", chapter: 11 },
      completedMeetingKeys: [],
      history: [],
      completedChapterKeys: [],
      shareReadingPresence: true,
    },
  },
  weeklyRanges: [
    { weekStart: "2026-07-20", bookId: "jer", startChapter: 18, endChapter: 19 },
  ],
  companion: defaultCompanionProfile,
};

export function normalizeReadingState(value?: Partial<ReadingState> | null): ReadingState {
  return {
    ...defaultReadingState,
    ...value,
    members: {
      husband: {
        ...defaultReadingState.members.husband,
        ...(value?.members?.husband ?? {}),
        completedChapterKeys: value?.members?.husband?.completedChapterKeys
          ?? Array.from(new Set((value?.members?.husband?.history ?? []).map((record) => `${record.ref.bookId}:${record.ref.chapter}`))),
      },
      wife: {
        ...defaultReadingState.members.wife,
        ...(value?.members?.wife ?? {}),
        completedChapterKeys: value?.members?.wife?.completedChapterKeys
          ?? Array.from(new Set((value?.members?.wife?.history ?? []).map((record) => `${record.ref.bookId}:${record.ref.chapter}`))),
      },
    },
    weeklyRanges: value?.weeklyRanges ?? defaultReadingState.weeklyRanges,
    companion: { ...defaultCompanionProfile, ...(value?.companion ?? {}) },
  };
}

export function getCompanionProfile(state: ReadingState): CompanionProfile {
  return { ...defaultCompanionProfile, ...state.companion };
}

export function isPresenceSharingEnabled(
  state: ReadingState,
  memberId: "husband" | "wife",
): boolean {
  return state.members[memberId].shareReadingPresence !== false;
}
