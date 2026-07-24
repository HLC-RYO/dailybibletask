"use client";

import { AnimatedHeroMascot } from "@/components/AnimatedHeroMascot";
import { useAppContext } from "@/context/AppContext";
import { useReadingPresence } from "@/hooks/useReadingPresence";
import { useSharedReadingState } from "@/hooks/useSharedReadingState";
import { formatChapter } from "@/lib/bible";
import { getCompanionStats } from "@/lib/companion";
import { getCompanionProfile } from "@/lib/defaults";
import { getNextReading } from "@/lib/reading-engine";

export default function HomePage() {
  const { memberId, partnerId, memberNames } = useAppContext();
  const [reading, , loading] = useSharedReadingState();
  const presence = useReadingPresence();
  const next = getNextReading(reading, memberId);
  const partnerPresence = presence[partnerId];
  const companion = getCompanionProfile(reading);
  const stats = getCompanionStats(reading, presence);

  return (
    <div className="treasure-home">
      <section className="treasure-hero" aria-labelledby="home-title">
        <div className="treasure-logo-row">
          <span className="paw-trail" aria-hidden="true">🐾</span>
          <h1 id="home-title"><b>宝</b><span>を</span><strong>探そう</strong></h1>
          <span className="treasure-chest" aria-hidden="true">🧰</span>
        </div>

        <div className="hero-mascot-wrap">
          <AnimatedHeroMascot
            name={companion.name}
            stats={stats}
            partnerReading={Boolean(partnerPresence)}
            selfReading={Boolean(presence[memberId])}
          />
          <div className="mascot-speech">
            <strong>{companion.name}</strong>
            <span>「{stats.message}」</span>
          </div>
        </div>
      </section>

      {partnerPresence && (
        <section className="live-reading-banner" aria-live="polite">
          <span className="live-dot" />
          <div>
            <strong>{memberNames[partnerId]}が今読んでいます</strong>
            <span>{formatChapter(partnerPresence.ref)}・{new Date(partnerPresence.startedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}開始</span>
          </div>
        </section>
      )}

      <section className="today-treasure-card">
        <div className="today-book-icon" aria-hidden="true">📖</div>
        <div className="today-treasure-copy">
          <small>{memberNames[memberId]}さんの今日の1章</small>
          <h2>{loading ? "読み込み中…" : formatChapter(next.ref)}</h2>
          <p>{next.mode === "meeting" ? `今週の集会範囲 ${next.meetingIndex}/${next.meetingTotal}` : "通常通読の続き"}</p>
        </div>
        <a href="/reading" className="treasure-action">今日の宝を探す <span>›</span></a>
      </section>

      <section className="home-quick-grid" aria-label="主な機能">
        <a href="/reading" className="quick-card green">
          <span className="quick-icon">🗺️</span><div><strong>集会範囲</strong><small>今週の範囲と通常通読</small></div>
        </a>
        <a href="/study" className="quick-card coral">
          <span className="quick-icon">📖</span><div><strong>ふたりの研究</strong><small>予定・準備・振り返り</small></div>
        </a>
        <a href="/notes" className="quick-card blue">
          <span className="quick-icon">🪶</span><div><strong>研究ノート</strong><small>見つけた宝を記録</small></div>
        </a>
        <a href="/settings" className="quick-card purple">
          <span className="quick-icon">⚙️</span><div><strong>設定</strong><small>目標や共有を調整</small></div>
        </a>
      </section>

      <section className="companion-summary-card">
        <div className="sleeping-dog" aria-hidden="true">🐕</div>
        <div>
          <span className="summary-label">今日のワンちゃん</span>
          <strong>{stats.moodLabel}</strong>
          <small>元気 {stats.energy}/5 ・ きずな {stats.bond} ・ 2人で {stats.totalChapters}章</small>
        </div>
      </section>

      <section className="daily-scripture-card">
        <span className="scripture-label">今日の聖句</span>
        <p>ここには、jw.orgに掲載されている聖書から選んだ聖句だけを表示します。</p>
        <a href="https://www.jw.org/ja/ライブラリー/聖書/" target="_blank" rel="noreferrer">jw.orgの聖書を開く</a>
      </section>

      <nav className="home-more-links" aria-label="その他の機能">
        <a href="/ministry">🗣️ 伝道資料</a>
        <a href="/tasks">✅ タスク</a>
      </nav>
    </div>
  );
}
