import { formatChapter } from "./bible";
import { toLocalISODate } from "./date";
import { getLiveReadingPresence } from "./presence";
import { companionMessage, companionStateLabel } from "./companion-states";
import type {
  CompanionStats,
  MemberId,
  ReadingPresenceState,
  ReadingRecord,
  ReadingState,
} from "./types";

const DAY = 86_400_000;

const STAGES = [
  { minimum: 0, name: "ちいさな子犬" },
  { minimum: 80, name: "元気な子犬" },
  { minimum: 250, name: "若い相棒" },
  { minimum: 600, name: "頼もしい相棒" },
  { minimum: 1200, name: "聖書の旅のパートナー" },
] as const;

const ITEMS = [
  { minimum: 0, name: "おそろいの名札" },
  { minimum: 50, name: "ふかふかクッション" },
  { minimum: 150, name: "みどりのバンダナ" },
  { minimum: 350, name: "小さな本棚" },
  { minimum: 700, name: "旅の首輪" },
  { minimum: 1200, name: "夕焼けの丘" },
] as const;

type XpEvent = { amount: number; occurredAt: Date };

function recordDateKey(record: ReadingRecord): string {
  return toLocalISODate(new Date(record.completedAt));
}

function completedToday(records: ReadingRecord[], today: string): boolean {
  return records.some((record) => recordDateKey(record) === today);
}

function sharedReadingDays(state: ReadingState): number {
  const husbandDays = new Set(state.members.husband.history.map(recordDateKey));
  return new Set(state.members.wife.history.map(recordDateKey).filter((date) => husbandDays.has(date))).size;
}

function dailyTextDate(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function xpEvents(state: ReadingState): XpEvent[] {
  const readingEvents = (["husband", "wife"] as MemberId[]).flatMap((memberId) =>
    state.members[memberId].history.map((record) => ({
      amount: (record.mode === "meeting" ? 15 : 10) + (record.note ? 5 : 0),
      occurredAt: new Date(record.completedAt),
    })),
  );
  const dailyTextEvents = (["husband", "wife"] as MemberId[]).flatMap((memberId) =>
    (state.dailyTextCompletedDates?.[memberId] ?? []).map((date) => ({ amount: 5, occurredAt: dailyTextDate(date) })),
  );
  return [...readingEvents, ...dailyTextEvents].filter((event) => !Number.isNaN(event.occurredAt.getTime()));
}

function sumSince(events: XpEvent[], now: Date, days: number): number {
  const threshold = now.getTime() - days * DAY;
  return events.reduce((sum, event) => event.occurredAt.getTime() >= threshold ? sum + event.amount : sum, 0);
}

function latestEvent(events: XpEvent[]): XpEvent | undefined {
  return events.reduce<XpEvent | undefined>((latest, event) =>
    !latest || event.occurredAt > latest.occurredAt ? event : latest, undefined);
}

function calculateMoodScore(events: XpEvent[], now: Date): { score: number; xp3: number; xp7: number; xp30: number } {
  if (!events.length) return { score: 30, xp3: 0, xp7: 0, xp30: 0 };
  const xp3 = sumSince(events, now, 3);
  const xp7 = sumSince(events, now, 7);
  const xp30 = sumSince(events, now, 30);
  const rate3 = Math.min(1, xp3 / 60);
  const rate7 = Math.min(1, xp7 / 140);
  const rate30 = Math.min(1, xp30 / 600);
  let score = 10 + 90 * (rate3 * 0.5 + rate7 * 0.3 + rate30 * 0.2);

  const latest = latestEvent(events);
  if (latest) {
    const hours = Math.max(0, (now.getTime() - latest.occurredAt.getTime()) / 3_600_000);
    if (hours <= 24) {
      const recoveryFloor = latest.amount >= 15 ? 46 : latest.amount >= 10 ? 40 : 32;
      score = Math.max(score + (score < 30 ? 12 : score < 40 ? 7 : 3), recoveryFloor);
    } else if (hours <= 72) {
      score += 4;
    }
  }
  return { score: Math.max(10, Math.min(100, Math.round(score))), xp3, xp7, xp30 };
}

function visualMood(score: number): CompanionStats["mood"] {
  if (score >= 85) return "excited";
  if (score >= 60) return "happy";
  if (score >= 40) return "content";
  if (score >= 30) return "waiting";
  return "sleepy";
}

export function getCompanionStats(
  state: ReadingState,
  presence: ReadingPresenceState = {},
  now = new Date(),
): CompanionStats {
  const husbandHistory = state.members.husband.history;
  const wifeHistory = state.members.wife.history;
  const allHistory = [...husbandHistory, ...wifeHistory];
  const totalChapters = allHistory.length;
  const dailyTextCompletions =
    (state.dailyTextCompletedDates?.husband?.length ?? 0) +
    (state.dailyTextCompletedDates?.wife?.length ?? 0);
  const noteCount = allHistory.filter((record) => record.note).length;
  const sharedDays = sharedReadingDays(state);
  const events = xpEvents(state);
  const experience = events.reduce((sum, event) => sum + event.amount, 0) + sharedDays * 5;
  const activity = calculateMoodScore(events, now);
  const today = toLocalISODate(now);
  const husbandToday = completedToday(husbandHistory, today);
  const wifeToday = completedToday(wifeHistory, today);
  const live = getLiveReadingPresence(presence, now);
  const activeReaders = (["husband", "wife"] as MemberId[]).filter((id) => Boolean(live[id]));

  let mood = visualMood(activity.score);
  let moodLabel = companionStateLabel(activity.score);
  let message = companionMessage(activity.score);

  if (activeReaders.length === 2) {
    mood = "excited";
    const sameChapter = live.husband?.ref.bookId === live.wife?.ref.bookId && live.husband?.ref.chapter === live.wife?.ref.chapter;
    message = sameChapter ? `2人とも${formatChapter(live.husband!.ref)}を読んでる！` : "2人とも今、聖書を読んでる！しっぽが止まらないよ。";
  } else if (activeReaders.length === 1) {
    const id = activeReaders[0];
    const name = id === "husband" ? "遼太朗" : "妻";
    mood = "happy";
    message = `${name}が今、${formatChapter(live[id]!.ref)}を読んでいるよ。`;
  } else if (husbandToday && wifeToday) {
    mood = "excited";
    message = "今日は2人とも1章読めたね！一緒に旅が進んだよ。";
  } else if (husbandToday || wifeToday) {
    mood = activity.score >= 85 ? "excited" : "happy";
    message = activity.score < 30 ? "わあ、来てくれた！もう元気になってきたよ！" : "今日も1章分、旅が進んだね。うれしいな！";
  }

  const stageIndex = STAGES.reduce((current, stage, index) => experience >= stage.minimum ? index : current, 0);
  const currentStage = STAGES[stageIndex];
  const nextStage = STAGES[stageIndex + 1];
  const stageProgress = nextStage
    ? Math.max(0, Math.min(100, Math.round(((experience - currentStage.minimum) / (nextStage.minimum - currentStage.minimum)) * 100)))
    : 100;
  const unlockedItems = ITEMS.filter((item) => experience >= item.minimum).map((item) => item.name);

  return {
    mood,
    moodLabel,
    message,
    energy: Math.max(1, Math.min(5, Math.ceil(activity.score / 20))),
    bond: Math.min(100, totalChapters * 2 + sharedDays * 5 + noteCount + dailyTextCompletions * 2),
    totalChapters,
    dailyTextCompletions,
    experience,
    moodScore: activity.score,
    xp3Days: activity.xp3,
    xp7Days: activity.xp7,
    xp30Days: activity.xp30,
    stage: stageIndex,
    stageName: currentStage.name,
    stageProgress,
    nextStageName: nextStage?.name,
    chaptersToNextStage: nextStage ? Math.max(0, nextStage.minimum - experience) : 0,
    unlockedItems,
    latestUnlockedItem: unlockedItems.at(-1) ?? "おそろいの名札",
  };
}
