"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DogCompanion } from "@/components/DogCompanion";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useReadingPresence } from "@/hooks/useReadingPresence";
import { useSharedReadingState } from "@/hooks/useSharedReadingState";
import { bibleBooks, formatChapter, getBook } from "@/lib/bible";
import { getCompanionStats } from "@/lib/companion";
import { getCompanionProfile, isPresenceSharingEnabled } from "@/lib/defaults";
import { getWeekStartISO } from "@/lib/date";
import { clearReadingPresence, publishReadingPresence } from "@/lib/presence";
import {
  completeNextReading,
  getNextReading,
  getSharedWeeklyProgress,
  undoLatestReading,
} from "@/lib/reading-engine";

export default function ReadingPage() {
  const { firebaseUser, household, memberId, partnerId, memberNames } = useAppContext();
  const [state, setState] = useSharedReadingState();
  const presence = useReadingPresence();
  const [note, setNote] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [rangeDraft, setRangeDraft] = useState({ bookId: "jer", startChapter: 1, endChapter: 1, sourceUrl: "" });
  const [isReading, setIsReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const startedAtRef = useRef<string | undefined>(undefined);
  const next = useMemo(() => getNextReading(state, memberId), [state, memberId]);
  const currentRange = state.weeklyRanges.find((range) => range.weekStart === getWeekStartISO());
  const progress = getSharedWeeklyProgress(state);
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const companion = getCompanionProfile(state);
  const companionStats = getCompanionStats(state, presence);
  const partnerPresence = presence[partnerId];
  const sharingEnabled = isPresenceSharingEnabled(state, memberId);

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
          sourceUrl: rangeDraft.sourceUrl.trim() || undefined,
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

      {partnerPresence && (
        <section className="live-reading-banner" aria-live="polite">
          <span className="live-dot" />
          <div>
            <strong>{memberNames[partnerId]}も今読書中</strong>
            <span>{formatChapter(partnerPresence.ref)}を読んでいます</span>
          </div>
          {partnerPresence.ref.bookId === next.ref.bookId && partnerPresence.ref.chapter === next.ref.chapter && (
            <span className="same-chapter-badge">同じ章！</span>
          )}
        </section>
      )}

      <section className={`panel quest ${isReading ? "reading-active" : ""}`}>
        <span className="quest-badge">{next.mode === "meeting" ? "今週の特別ルート" : "通常の旅"}</span>
        <h2>{formatChapter(next.ref)}</h2>
        <p>{next.mode === "meeting" ? `集会範囲の ${next.meetingIndex}章目 / 全${next.meetingTotal}章` : "以前の通読位置から1章進みます"}</p>
        {next.mode === "meeting" && <div className="return-place">完了後の帰還地点：{formatChapter(state.members[memberId].normalNext)}</div>}

        <div className="reading-presence-control">
          {isReading ? (
            <>
              <span className="reading-now"><i />{sharingEnabled ? "読書中として相手に表示しています" : "この画面で読書中（相手には非公開）"}</span>
              <button className="text-button" onClick={stopReading}>読書をいったん終了</button>
            </>
          ) : (
            <>
              <button className="button start-reading" onClick={beginReading}>この章を読み始める</button>
              <small>{sharingEnabled ? "相手の画面に「今読んでいる」と表示されます" : "読書状況は非公開設定です"}</small>
            </>
          )}
        </div>

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

      <section className="panel">
        <div className="panel-title"><h2>今週の夫婦ゲージ</h2><strong>{percent}%</strong></div>
        <div className="progress-track"><div className="progress-bar" style={{ width: `${percent}%` }} /></div>
        <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 13 }}>2人で {progress.done}/{progress.total || 0}章完了</p>
        <div className="stat-row" style={{ marginTop: 12 }}>
          <div className="stat"><span>ワンちゃんとのきずな</span><strong>{companionStats.bond}</strong></div>
          <div className="stat"><span>2人の累計</span><strong>{companionStats.totalChapters}章</strong></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>今週の集会範囲</h2>
          <button className="button secondary" onClick={() => setShowSettings((value) => !value)}>{showSettings ? "閉じる" : "変更"}</button>
        </div>
        {currentRange ? <p>{getBook(currentRange.bookId).name} {currentRange.startChapter}–{currentRange.endChapter}章</p> : <p>今週の範囲は未設定です。</p>}
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
