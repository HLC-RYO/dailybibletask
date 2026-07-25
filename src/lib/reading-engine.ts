import { advanceChapter } from "./bible";
import { canonicalChapterKey } from "./progress";
import { getWeekStartISO, toLocalISODate } from "./date";
import type { ChapterRef, MemberId, ReadingState, StudyPlan, WeeklyMeetingRange } from "./types";

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
  const trimmedNote = note.trim();
  const record = {
    id: crypto.randomUUID(),
    memberId,
    ref: next.ref,
    mode: next.mode,
    completedAt: new Date().toISOString(),
    ...(trimmedNote ? { note: trimmedNote } : {}),
  } as const;

  const updatedMember = {
    ...member,
    completedMeetingKeys:
      next.mode === "meeting" && next.range
        ? [...member.completedMeetingKeys, chapterKey(next.range.weekStart, next.ref)]
        : member.completedMeetingKeys,
    normalNext: next.mode === "normal" ? advanceChapter(next.ref) : member.normalNext,
    history: [record, ...member.history],
    completedChapterKeys: Array.from(new Set([...(member.completedChapterKeys ?? []), canonicalChapterKey(next.ref)])),
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

export type SharedWeeklyProgress = {
  points: number;
  goal: number;
  percent: number;
  readingPoints: number;
  dailyTextPoints: number;
  studyPoints: number;
  togetherBonus: number;
};

export function getSharedWeeklyProgress(
  state: ReadingState,
  studyPlans: StudyPlan[] = [],
  date = new Date(),
): SharedWeeklyProgress {
  const weekStart = getWeekStartISO(date);
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const inWeek = (value: string | Date) => {
    const target = value instanceof Date ? value : new Date(value);
    return !Number.isNaN(target.getTime()) && target >= start && target < end;
  };

  const histories = (["husband", "wife"] as MemberId[]).flatMap((memberId) =>
    state.members[memberId].history.filter((record) => inWeek(record.completedAt)),
  );
  const readingPoints = histories.length * 10;

  const dailyTextPoints = (["husband", "wife"] as MemberId[]).reduce((sum, memberId) =>
    sum + (state.dailyTextCompletedDates?.[memberId] ?? []).filter((day) => {
      const target = new Date(`${day}T12:00:00`);
      return inWeek(target);
    }).length * 5, 0);

  const studyPoints = studyPlans.filter((plan) =>
    plan.status === "done" && inWeek(new Date(`${plan.scheduledAt}T12:00:00`)),
  ).length * 40;

  const husbandDays = new Set(
    state.members.husband.history.filter((record) => inWeek(record.completedAt))
      .map((record) => toLocalISODate(new Date(record.completedAt))),
  );
  const sharedDays = new Set(
    state.members.wife.history.filter((record) => inWeek(record.completedAt))
      .map((record) => toLocalISODate(new Date(record.completedAt)))
      .filter((day) => husbandDays.has(day)),
  ).size;
  const togetherBonus = sharedDays * 5;
  const points = readingPoints + dailyTextPoints + studyPoints + togetherBonus;
  const goal = 180;

  return {
    points,
    goal,
    percent: Math.min(100, Math.round((points / goal) * 100)),
    readingPoints,
    dailyTextPoints,
    studyPoints,
    togetherBonus,
  };
}
