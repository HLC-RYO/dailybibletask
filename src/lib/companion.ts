import { formatChapter } from "./bible";
import { toLocalISODate } from "./date";
import { getLiveReadingPresence } from "./presence";
import type {
  CompanionStats,
  MemberId,
  ReadingPresenceState,
  ReadingRecord,
  ReadingState,
} from "./types";

const STAGES = [
  { minimum: 0, name: "ちいさな子犬" },
  { minimum: 8, name: "元気な子犬" },
  { minimum: 25, name: "若い相棒" },
  { minimum: 60, name: "頼もしい相棒" },
  { minimum: 120, name: "聖書の旅のパートナー" },
] as const;

const ITEMS = [
  { minimum: 0, name: "おそろいの名札" },
  { minimum: 5, name: "ふかふかクッション" },
  { minimum: 15, name: "みどりのバンダナ" },
  { minimum: 35, name: "小さな本棚" },
  { minimum: 70, name: "旅の首輪" },
  { minimum: 120, name: "夕焼けの丘" },
] as const;

function recordDateKey(record: ReadingRecord): string {
  return toLocalISODate(new Date(record.completedAt));
}

function completedToday(records: ReadingRecord[], today: string): boolean {
  return records.some((record) => recordDateKey(record) === today);
}

function daysSinceLatest(records: ReadingRecord[], now: Date): number {
  if (!records.length) return Number.POSITIVE_INFINITY;
  const latest = Math.max(...records.map((record) => new Date(record.completedAt).getTime()));
  return Math.floor((now.getTime() - latest) / 86_400_000);
}

function sharedReadingDays(state: ReadingState): number {
  const husbandDays = new Set(state.members.husband.history.map(recordDateKey));
  return new Set(state.members.wife.history.map(recordDateKey).filter((date) => husbandDays.has(date))).size;
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
  const today = toLocalISODate(now);
  const husbandToday = completedToday(husbandHistory, today);
  const wifeToday = completedToday(wifeHistory, today);
  const live = getLiveReadingPresence(presence, now);
  const activeReaders = (["husband", "wife"] as MemberId[]).filter((id) => Boolean(live[id]));
  const noteCount = allHistory.filter((record) => record.note).length;
  const sharedDays = sharedReadingDays(state);

  let mood: CompanionStats["mood"] = "waiting";
  let moodLabel = "のんびり待っています";
  let message = "本棚の前で、次の1章をのんびり待っているよ。";
  let energy = 2;

  if (activeReaders.length === 2) {
    mood = "excited";
    moodLabel = "大よろこび";
    const sameChapter =
      live.husband?.ref.bookId === live.wife?.ref.bookId &&
      live.husband?.ref.chapter === live.wife?.ref.chapter;
    message = sameChapter
      ? `2人とも${formatChapter(live.husband!.ref)}を読んでる！`
      : "2人とも今、聖書を読んでる！しっぽが止まらないよ。";
    energy = 5;
  } else if (activeReaders.length === 1) {
    const id = activeReaders[0];
    const name = id === "husband" ? "遼太朗" : "妻";
    mood = "happy";
    moodLabel = "うれしそう";
    message = `${name}が今、${formatChapter(live[id]!.ref)}を読んでいるよ。`;
    energy = 5;
  } else if (husbandToday && wifeToday) {
    mood = "excited";
    moodLabel = "大満足";
    message = "今日は2人とも1章読めたね！一緒に旅が進んだよ。";
    energy = 5;
  } else if (husbandToday || wifeToday) {
    mood = "happy";
    moodLabel = "ごきげん";
    message = "今日も1章分、旅が進んだね。ここでのんびり待ってるよ。";
    energy = 4;
  } else {
    const elapsed = daysSinceLatest(allHistory, now);
    if (elapsed <= 2) {
      mood = "content";
      moodLabel = "落ち着いています";
      message = "最近読んだところを思い出しながら、くつろいでいるよ。";
      energy = 3;
    } else if (elapsed <= 5) {
      mood = "sleepy";
      moodLabel = "お昼寝中";
      message = "ふかふかの場所でお昼寝中。また始めるとすぐ元気になるよ。";
      energy = 3;
    }
  }

  const stageIndex = STAGES.reduce(
    (current, stage, index) => (totalChapters >= stage.minimum ? index : current),
    0,
  );
  const currentStage = STAGES[stageIndex];
  const nextStage = STAGES[stageIndex + 1];
  const stageProgress = nextStage
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((totalChapters - currentStage.minimum) / (nextStage.minimum - currentStage.minimum)) * 100,
          ),
        ),
      )
    : 100;
  const unlockedItems = ITEMS.filter((item) => totalChapters >= item.minimum).map((item) => item.name);

  return {
    mood,
    moodLabel,
    message,
    energy,
    bond: Math.min(100, totalChapters * 2 + sharedDays * 5 + noteCount),
    totalChapters,
    stage: stageIndex,
    stageName: currentStage.name,
    stageProgress,
    nextStageName: nextStage?.name,
    chaptersToNextStage: nextStage ? Math.max(0, nextStage.minimum - totalChapters) : 0,
    unlockedItems,
    latestUnlockedItem: unlockedItems.at(-1) ?? "おそろいの名札",
  };
}
