import { advanceChapter } from "./bible";
import { getWeekStartISO } from "./date";
import type { ChapterRef, MemberId, ReadingState, WeeklyMeetingRange } from "./types";

export type NextReading = {
  mode: "meeting" | "normal";
  ref: ChapterRef;
  range?: WeeklyMeetingRange;
  meetingIndex?: number;
  meetingTotal?: number;
};

export function chapterKey(weekStart: string, ref: ChapterRef): string {
  return `${weekStart}:${ref.bookId}:${ref.chapter}`;
}

export function listRange(range: WeeklyMeetingRange): ChapterRef[] {
  const result: ChapterRef[] = [];
  for (let chapter = range.startChapter; chapter <= range.endChapter; chapter += 1) {
    result.push({ bookId: range.bookId, chapter });
  }
  return result;
}

export function getCurrentRange(state: ReadingState, date = new Date()): WeeklyMeetingRange | undefined {
  const weekStart = getWeekStartISO(date);
  return state.weeklyRanges.find((range) => range.weekStart === weekStart);
}

export function getNextReading(state: ReadingState, memberId: MemberId, date = new Date()): NextReading {
  const member = state.members[memberId];
  const range = getCurrentRange(state, date);
  if (range) {
    const chapters = listRange(range);
    const unreadIndex = chapters.findIndex(
      (ref) => !member.completedMeetingKeys.includes(chapterKey(range.weekStart, ref)),
    );
    if (unreadIndex >= 0) {
      return {
        mode: "meeting",
        ref: chapters[unreadIndex],
        range,
        meetingIndex: unreadIndex + 1,
        meetingTotal: chapters.length,
      };
    }
  }
  return { mode: "normal", ref: member.normalNext };
}

export function completeNextReading(
  state: ReadingState,
  memberId: MemberId,
  note: string,
  date = new Date(),
): ReadingState {
  const next = getNextReading(state, memberId, date);
  const member = state.members[memberId];
  const record = {
    id: crypto.randomUUID(),
    memberId,
    ref: next.ref,
    mode: next.mode,
    completedAt: new Date().toISOString(),
    note: note.trim() || undefined,
  } as const;

  const updatedMember = {
    ...member,
    completedMeetingKeys:
      next.mode === "meeting" && next.range
        ? [...member.completedMeetingKeys, chapterKey(next.range.weekStart, next.ref)]
        : member.completedMeetingKeys,
    normalNext: next.mode === "normal" ? advanceChapter(next.ref) : member.normalNext,
    history: [record, ...member.history],
  };

  return {
    ...state,
    members: { ...state.members, [memberId]: updatedMember },
  };
}

export function undoLatestReading(state: ReadingState, memberId: MemberId): ReadingState {
  const member = state.members[memberId];
  const [latest, ...rest] = member.history;
  if (!latest) return state;

  const range = getCurrentRange(state, new Date(latest.completedAt));
  let completedMeetingKeys = member.completedMeetingKeys;
  let normalNext = member.normalNext;

  if (latest.mode === "meeting" && range) {
    const key = chapterKey(range.weekStart, latest.ref);
    completedMeetingKeys = completedMeetingKeys.filter((item) => item !== key);
  } else if (latest.mode === "normal") {
    normalNext = latest.ref;
  }

  return {
    ...state,
    members: {
      ...state.members,
      [memberId]: { ...member, completedMeetingKeys, normalNext, history: rest },
    },
  };
}

export function getMemberXp(state: ReadingState, memberId: MemberId): number {
  return state.members[memberId].history.reduce((sum, record) => sum + (record.mode === "meeting" ? 15 : 10) + (record.note ? 5 : 0), 0);
}

export function getSharedWeeklyProgress(state: ReadingState, date = new Date()): { done: number; total: number } {
  const range = getCurrentRange(state, date);
  if (!range) return { done: 0, total: 0 };
  const refs = listRange(range);
  const total = refs.length * 2;
  const done = (["husband", "wife"] as MemberId[]).reduce((count, memberId) => {
    return count + refs.filter((ref) => state.members[memberId].completedMeetingKeys.includes(chapterKey(range.weekStart, ref))).length;
  }, 0);
  return { done, total };
}
