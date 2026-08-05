"use client";

import { useEffect, useMemo, useState } from "react";
import { DogCompanion } from "@/components/DogCompanion";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import { useReadingPresence } from "@/hooks/useReadingPresence";
import { useSharedReadingState } from "@/hooks/useSharedReadingState";
import { bibleBooks, formatChapter, getBook } from "@/lib/bible";
import { getCompanionStats } from "@/lib/companion";
import { getCompanionProfile } from "@/lib/defaults";
import type { StudyPlan } from "@/lib/types";
import { getWeekStartISO } from "@/lib/date";
import { clearReadingPresence, publishReadingPresence } from "@/lib/presence";

type WeeklyReadingResponse = {
  weekStart: string;
  bookId: string;
  bookName: string;
  startChapter: number;
  endChapter: number;
  sourceUrl: string;
  rangeLabel: string;
  error?: string;
};
import {
  completeNextReading,
  getNextReading,
  getSharedWeeklyProgress,
  undoLatestReading,
} from "@/lib/reading-engine";

export default function ReadingPage() {
  const { memberId, partnerId, memberNames } = useAppContext();
  const [state, setState] = useSharedReadingState();
  const presence = useReadingPresence();
  const { items: studyPlans } = useHouseholdCollection<StudyPlan>("studyPlans");
  const [note, setNote] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [rangeDraft, setRangeDraft] = useState({ bookId: "jer", startChapter: 1, endChapter: 1, sourceUrl: "" });
  const [isReading, setIsReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [autoRangeLoading, setAutoRangeLoading] = useState(false);
  const [autoRangeMessage, setAutoRangeMessage] = useState("");
  const startedAtRef = useRef<string | undefined>(undefined);
  const next = useMemo(() => getNextReading(state, memberId), [state, memberId]);
  const currentRange = state.weeklyRanges.find((range) => range.weekStart === getWeekStartISO());
  const progress = getSharedWeeklyProgress(state, studyPlans);
  const percent = progress.percent;
  const companion = getCompanionProfile(state);
  const companionStats = getCompanionStats(state, {});
  const partnerLatestReading = useMemo(() => {
    const history = state.members[partnerId]?.history ?? [];
    return [...history].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  }, [state.members, partnerId]);

  useEffect(() => {
    if (!showSettings) return;
    setRangeDraft({
      bookId: currentRange?.bookId ?? "jer",
      startChapter: currentRange?.startChapter ?? 1,
      endChapter: currentRange?.endChapter ?? 1,
      sourceUrl: currentRange?.sourceUrl ?? "",
    });
  }, [showSettings, currentRange?.bookId, currentRange?.startChapter, currentRange?.endChapter, currentRange?.sourceUrl]);

  useEffect(() => {
    if (!isReading || !sharingEnabled || !household || !firebaseUser) return;
    const publish = () => {
      if (document.visibilityState !== "visible") return;
      void publishReadingPresence({
        householdId: household.id,
        uid: firebaseUser.uid,
        memberId,
        chapterRef: next.ref,
        startedAt: startedAtRef.current,
      });
    };
    publish();
    const timer = window.setInterval(publish, 20_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") publish();
      else void clearReadingPresence(household.id, firebaseUser.uid);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      void clearReadingPresence(household.id, firebaseUser.uid);
    };
  }, [isReading, sharingEnabled, household, firebaseUser, memberId, next.ref.bookId, next.ref.chapter]);

  const beginReading = () => {
    startedAtRef.current = new Date().toISOString();
    setIsReading(true);
  };

  const stopReading = () => {
    setIsReading(false);
    startedAtRef.current = undefined;
    if (household && firebaseUser) void clearReadingPresence(household.id, firebaseUser.uid);
  };

  const complete = async () => {
    setBusy(true);
    stopReading();
    try {
      await setState((current) => completeNextReading(current, memberId, note));
      setNote("");
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    setBusy(true);
    stopReading();
    try {
      await setState((current) => undoLatestReading(current, memberId));
    } finally {
      setBusy(false);
    }
  };

  const fetchWeeklyRange = async (force = false) => {
    const weekStart = getWeekStartISO();
    if (!force && state.weeklyRanges.some((range) => range.weekStart === weekStart)) return;

    setAutoRangeLoading(true);
    setAutoRangeMessage("");
    try {
      const response = await fetch("/api/weekly-reading", {
        cache: "no-store",
      });
      const data = await response.json() as WeeklyReadingResponse;
      if (!response.ok || data.error) {
        throw new Error(data.error || "今週の範囲を取得できませんでした");
      }

      const book = getBook(data.bookId);
      const startChapter = Math.min(Math.max(1, data.startChapter), book.chapters);
      const endChapter = Math.min(Math.max(startChapter, data.endChapter), book.chapters);

      await setState((current) => ({
        ...current,
        weeklyRanges: [
          ...current.weeklyRanges.filter((range) => range.weekStart !== data.weekStart),
          {
            weekStart: data.weekStart,
            bookId: data.bookId,
            startChapter,
            endChapter,
            sourceUrl: data.sourceUrl,
          },
        ],
      }));
      setAutoRangeMessage(`${data.rangeLabel}をWOLから設定しました`);
    } catch (error) {
      setAutoRangeMessage(error instanceof Error ? error.message : "自動取得に失敗しました");
    } finally {
      setAutoRangeLoading(false);
    }
  };

  useEffect(() => {
    void fetchWeeklyRange(false);
  }, [currentRange?.weekStart]);

  const saveCurrentRange = async () => {
    const weekStart = getWeekStartISO();
    const book = getBook(rangeDraft.bookId);
    const startChapter = Math.min(Math.max(1, rangeDraft.startChapter), book.chapters);
    const endChapter = Math.min(Math.max(startChapter, rangeDraft.endChapter), book.chapters);
    await setState((current) => ({
      ...current,
      weeklyRanges: [
        ...current.weeklyRanges.filter((range) => range.weekStart !== weekStart),
        {
          weekStart,
          bookId: rangeDraft.bookId,
          startChapter,
          endChapter,
          ...(rangeDraft.sourceUrl.trim() ? { sourceUrl: rangeDraft.sourceUrl.trim() } : {}),
        },
      ],
    }));
    setShowSettings(false);
  };

  return (
    <>
      <PageHeader title="聖書の旅" subtitle="集会範囲を終えたら、通常通読の続きへ自動で戻ります" />

      <div className="current-member-chip">あなた：{memberNames[memberId]}</div>

      <DogCompanion name={companion.name} stats={companionStats} compact />

      <section className="partner-last-reading-card">
        <div className="partner-last-reading-icon">📖</div>
        <div>
          <span className="meta">{memberNames[partnerId]}が最後に読んだ場所</span>
          {partnerLatestReading ? (
            <>
              <strong>{formatChapter(partnerLatestReading.ref)}</strong>
              <small>{new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(partnerLatestReading.completedAt))}</small>
            </>
          ) : (
            <strong>まだ読書記録がありません</strong>
          )}
        </div>
      </section>
      <section className="panel quest">
        <span className="quest-badge">{next.mode === "meeting" ? "今週の特別ルート" : "通常の旅"}</span>
        <h2>{formatChapter(next.ref)}</h2>
        <p>{next.mode === "meeting" ? `集会範囲の ${next.meetingIndex}章目 / 全${next.meetingTotal}章` : "以前の通読位置から1章進みます"}</p>
        {next.mode === "meeting" && <div className="return-place">完了後の帰還地点：{formatChapter(state.members[memberId].normalNext)}</div>}

        <div className="form-grid" style={{ marginTop: 14 }}>
          <label>心に残ったこと（任意・ワンちゃんとのきずなも深まります）
            <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="一言だけでも残せます" />
          </label>
        </div>
        <div className="button-row">
          <button className="button" disabled={busy} onClick={complete}>{busy ? "保存中…" : "読んだ ✓"}</button>
          <button className="button secondary" disabled={busy || state.members[memberId].history.length === 0} onClick={undo}>直前を取り消す</button>
        </div>
      </section>

      <a href="/reading/progress" className="progress-entry-card">
        <div><span>全1189章を記録</span><strong>聖書全体の進捗を見る</strong><small>66冊ごと・章ごとに確認できます</small></div>
        <b>›</b>
      </a>

      <section className="panel">
        <div className="panel-title"><h2>今週の夫婦ゲージ</h2><strong>{percent}%</strong></div>
        <div className="progress-track"><div className="progress-bar" style={{ width: `${percent}%` }} /></div>
        <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13 }}>今週 {progress.points}/{progress.goal}ポイント</p>
        <div className="button-row weekly-gauge-breakdown">
          <span className="pill">聖書 {progress.readingPoints}</span>
          <span className="pill">日々の聖句 {progress.dailyTextPoints}</span>
          <span className="pill">ふたりの研究 {progress.studyPoints}</span>
          <span className="pill">一緒の日 {progress.togetherBonus}</span>
        </div>
        <div className="stat-row" style={{ marginTop: 12 }}>
          <div className="stat"><span>ワンちゃんとのきずな</span><strong>{companionStats.bond}</strong></div>
          <div className="stat"><span>2人の累計</span><strong>{companionStats.totalChapters}章</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>今週の集会範囲</h2>
          <div className="button-row">
            <button className="button secondary" disabled={autoRangeLoading} onClick={() => fetchWeeklyRange(true)}>
              {autoRangeLoading ? "取得中…" : "WOLから再取得"}
            </button>
            <button className="button secondary" onClick={() => setShowSettings((value) => !value)}>{showSettings ? "閉じる" : "変更"}</button>
          </div>
        </div>
        {currentRange ? (
          <>
            <p>{getBook(currentRange.bookId).name} {currentRange.startChapter}–{currentRange.endChapter}章</p>
            {currentRange.sourceUrl && <a href={currentRange.sourceUrl} target="_blank" rel="noreferrer">WOLで今週の予定を見る</a>}
          </>
        ) : <p>今週の範囲は未設定です。WOLから自動取得を試しています。</p>}
        {autoRangeMessage && <p className="meta">{autoRangeMessage}</p>}
        {showSettings && (
          <div className="form-grid">
            <label>書
              <select className="select" value={rangeDraft.bookId} onChange={(event) => setRangeDraft((draft) => ({ ...draft, bookId: event.target.value, startChapter: 1, endChapter: 1 }))}>
                {bibleBooks.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}
              </select>
            </label>
            <div className="form-row">
              <label>開始章
                <input className="input" type="number" min="1" max={getBook(rangeDraft.bookId).chapters} value={rangeDraft.startChapter} onChange={(event) => setRangeDraft((draft) => ({ ...draft, startChapter: Number(event.target.value) || 1 }))} />
              </label>
              <label>終了章
                <input className="input" type="number" min="1" max={getBook(rangeDraft.bookId).chapters} value={rangeDraft.endChapter} onChange={(event) => setRangeDraft((draft) => ({ ...draft, endChapter: Number(event.target.value) || 1 }))} />
              </label>
            </div>
            <label>集会予定のリンク（任意）
              <input className="input" value={rangeDraft.sourceUrl} onChange={(event) => setRangeDraft((draft) => ({ ...draft, sourceUrl: event.target.value }))} placeholder="https://www.jw.org/finder?..." />
            </label>
            <button className="button" onClick={saveCurrentRange}>今週の範囲を保存</button>
          </div>
        )}
      </section>
    </>
  );
}


