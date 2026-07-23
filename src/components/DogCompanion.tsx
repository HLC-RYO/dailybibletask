import type { CompanionStats } from "@/lib/types";

type Props = {
  name: string;
  stats: CompanionStats;
  compact?: boolean;
};

const itemIcons: Record<string, string> = {
  "おそろいの名札": "🏷️",
  "ふかふかクッション": "🛏️",
  "みどりのバンダナ": "🧣",
  "小さな本棚": "📚",
  "旅の首輪": "🦴",
  "夕焼けの丘": "🌅",
};

export function DogCompanion({ name, stats, compact = false }: Props) {
  const hearts = `${"♥".repeat(stats.energy)}${"♡".repeat(5 - stats.energy)}`;
  return (
    <section className={`companion-card mood-${stats.mood} ${compact ? "compact" : ""}`}>
      <div className={`dog-scene stage-${stats.stage}`} aria-label={`${name}、${stats.moodLabel}`}>
        <span className="dog-accessory" aria-hidden="true">{itemIcons[stats.latestUnlockedItem] ?? "🏷️"}</span>
        <img className="dog-image" src="/dachshund.svg" alt="" aria-hidden="true" />
        {stats.mood === "sleepy" && <span className="sleep-mark" aria-hidden="true">Zzz</span>}
        {stats.mood === "excited" && <span className="joy-mark" aria-hidden="true">♪</span>}
      </div>

      <div className="companion-copy">
        <div className="companion-heading">
          <div>
            <span className="status-pill"><i />{stats.moodLabel}</span>
            <h2>{name}</h2>
          </div>
          <span className="stage-label">{stats.stageName}</span>
        </div>
        <p className="dog-message">「{stats.message}」</p>

        <div className="companion-meters">
          <div><span>元気</span><strong className="heart-meter" aria-label={`元気 ${stats.energy}/5`}>{hearts}</strong></div>
          <div><span>きずな</span><strong>{stats.bond}</strong></div>
          <div><span>2人の累計</span><strong>{stats.totalChapters}章</strong></div>
        </div>

        {!compact && (
          <div className="growth-area">
            <div className="growth-title">
              <span>{stats.nextStageName ? `次の成長：${stats.nextStageName}` : "最高のパートナーに成長しました"}</span>
              <strong>{stats.nextStageName ? `あと${stats.chaptersToNextStage}章` : "100%"}</strong>
            </div>
            <div className="progress-track"><div className="progress-bar" style={{ width: `${stats.stageProgress}%` }} /></div>
            <small>最近のごほうび：{stats.latestUnlockedItem}</small>
          </div>
        )}
      </div>
    </section>
  );
}
