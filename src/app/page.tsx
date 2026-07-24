"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatedHeroMascot } from "@/components/AnimatedHeroMascot";
import { useAppContext } from "@/context/AppContext";
import { useReadingPresence } from "@/hooks/useReadingPresence";
import { useSharedReadingState } from "@/hooks/useSharedReadingState";
import { formatChapter } from "@/lib/bible";
import { getCompanionStats } from "@/lib/companion";
import { getCompanionProfile } from "@/lib/defaults";
import { getNextReading } from "@/lib/reading-engine";

type DailyTextResponse = {
  date: string;
  scripture: string | null;
  sourceUrl: string;
  detailUrl: string;
  error?: string;
};

export default function HomePage() {
  const { memberId, partnerId, memberNames } = useAppContext();
  const [reading, setReading, loading] = useSharedReadingState();
  const presence = useReadingPresence();
  const next = getNextReading(reading, memberId);
  const partnerPresence = presence[partnerId];
  const companion = getCompanionProfile(reading);
  const stats = getCompanionStats(reading, presence);
  const [dailyText, setDailyText] = useState<DailyTextResponse | null>(null);
  const [dailyTextLoading, setDailyTextLoading] = useState(true);
  const [dailyTextBusy, setDailyTextBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setDailyTextLoading(true);
      try {
        const response = await fetch("/api/daily-text", { cache: "no-store" });
        const value = await response.json() as DailyTextResponse;
        if (!cancelled) setDailyText(value);
      } catch {
        if (!cancelled) setDailyText(null);
      } finally {
        if (!cancelled) setDailyTextLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const dailyTextDone = useMemo(() => {
    if (!dailyText?.date) return false;
    return reading.dailyTextCompletedDates?.[memberId]?.includes(dailyText.date) ?? false;
  }, [dailyText?.date, memberId, reading.dailyTextCompletedDates]);

  const completeDailyText = async () => {
    if (!dailyText?.date || dailyTextDone) return;
    setDailyTextBusy(true);
    try {
      await setReading((current) => ({
        ...current,
        dailyTextCompletedDates: {
          husband: current.dailyTextCompletedDates?.husband ?? [],
          wife: current.dailyTextCompletedDates?.wife ?? [],
          [memberId]: Array.from(new Set([
            ...(current.dailyTextCompletedDates?.[memberId] ?? []),
            dailyText.date,
          ])),
        },
      }));
    } finally {
      setDailyTextBusy(false);
    }
  };

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
        <div>
          <span className="summary-label">今日のワンちゃん</span>
          <strong>{stats.moodLabel}</strong>
          <small>元気 {stats.energy}/5 ・ きずな {stats.bond} ・ 経験値 {stats.experience} XP</small>
        </div>
      </section>

      <section className={`daily-scripture-card ${dailyTextDone ? "completed" : ""}`}>
        <div className="daily-scripture-heading">
          <span className="scripture-label">日々の聖句</span>
          {dailyTextDone && <span className="daily-complete-badge">完了</span>}
        </div>
        {dailyTextLoading ? (
          <p>今日の聖句を読み込んでいます…</p>
        ) : dailyText?.scripture ? (
          <p className="daily-scripture-text">{dailyText.scripture}</p>
        ) : (
          <p>今日の聖句を取得できませんでした。公式ページで確認してください。</p>
        )}
        <div className="daily-scripture-actions">
          <a href="https://wol.jw.org/ja/wol/h/r7/lp-j" target="_blank" rel="noreferrer">解説をWOLで読む</a>
          <button className="button" disabled={!dailyText?.scripture || dailyTextDone || dailyTextBusy} onClick={completeDailyText}>
            {dailyTextDone ? "読了済み ✓" : dailyTextBusy ? "保存中…" : "読んだ・完了"}
          </button>
        </div>
      </section>

      <nav className="home-more-links" aria-label="その他の機能">
        <a href="/ministry">🗣️ 伝道資料</a>
        <a href="/tasks">✅ タスク</a>
      </nav>
    </div>
  );
}
