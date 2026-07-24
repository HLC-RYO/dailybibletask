"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useSharedReadingState } from "@/hooks/useSharedReadingState";
import { bibleBooks } from "@/lib/bible";
import { getBookProgress, getMemberProgress, getSharedProgress, isChapterCompleted, toggleChapterCompleted } from "@/lib/progress";
import type { MemberId } from "@/lib/types";

type ViewMode = MemberId | "both";

export default function BibleProgressPage() {
  const { memberId, partnerId, memberNames } = useAppContext();
  const [state, setState, loading] = useSharedReadingState();
  const [view, setView] = useState<ViewMode>(memberId);
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const mine = getMemberProgress(state, memberId);
  const partner = getMemberProgress(state, partnerId);
  const shared = getSharedProgress(state);
  const activeMember = view === "both" ? memberId : view;

  const summary = useMemo(() => {
    if (view === "both") return { completed: shared.both, total: shared.total, percent: Math.round((shared.both / shared.total) * 1000) / 10 };
    return getMemberProgress(state, view);
  }, [state, view, shared.both, shared.total]);

  const chapterDone = (bookId: string, chapter: number) => {
    if (view === "both") {
      return isChapterCompleted(state, "husband", { bookId, chapter }) && isChapterCompleted(state, "wife", { bookId, chapter });
    }
    return isChapterCompleted(state, view, { bookId, chapter });
  };

  const toggle = async (bookId: string, chapter: number) => {
    if (view === "both") return;
    await setState((current) => toggleChapterCompleted(current, activeMember, { bookId, chapter }));
  };

  return (
    <>
      <PageHeader title="聖書全体の進捗" subtitle="66冊・全1189章の読了状況を確認できます" />

      <section className="panel bible-progress-hero">
        <div>
          <span className="progress-kicker">{view === "both" ? "2人とも読了" : `${memberNames[view]}の進捗`}</span>
          <strong>{loading ? "—" : summary.completed}<small> / {summary.total}章</small></strong>
          <p>{summary.percent}% 完了</p>
        </div>
        <div className="bible-progress-ring" style={{ "--progress": `${summary.percent * 3.6}deg` } as CSSProperties}>
          <span>{summary.percent}%</span>
        </div>
      </section>

      <div className="progress-view-tabs">
        <button className={view === memberId ? "active" : ""} onClick={() => setView(memberId)}>自分</button>
        <button className={view === partnerId ? "active" : ""} onClick={() => setView(partnerId)}>{memberNames[partnerId]}</button>
        <button className={view === "both" ? "active" : ""} onClick={() => setView("both")}>2人とも</button>
      </div>

      <section className="progress-mini-grid">
        <div><span>{memberNames[memberId]}</span><strong>{mine.completed}章</strong></div>
        <div><span>{memberNames[partnerId]}</span><strong>{partner.completed}章</strong></div>
        <div><span>2人とも</span><strong>{shared.both}章</strong></div>
      </section>

      <section className="book-progress-list">
        {bibleBooks.map((book) => {
          const progress = view === "both"
            ? (() => {
                let completed = 0;
                for (let chapter = 1; chapter <= book.chapters; chapter += 1) if (chapterDone(book.id, chapter)) completed += 1;
                return { completed, total: book.chapters, percent: Math.round((completed / book.chapters) * 100) };
              })()
            : getBookProgress(state, view, book.id);
          const open = openBookId === book.id;
          return (
            <article className={`book-progress-card ${progress.completed === progress.total ? "complete" : ""}`} key={book.id}>
              <button className="book-progress-summary" onClick={() => setOpenBookId(open ? null : book.id)}>
                <div>
                  <strong>{book.name}</strong>
                  <span>{progress.completed} / {progress.total}章</span>
                </div>
                <div className="book-progress-meter"><i style={{ width: `${progress.percent}%` }} /></div>
                <b>{progress.percent}%</b>
                <span className="book-chevron">{open ? "−" : "+"}</span>
              </button>
              {open && (
                <div className="chapter-check-grid">
                  {Array.from({ length: book.chapters }, (_, index) => index + 1).map((chapter) => {
                    const done = chapterDone(book.id, chapter);
                    return (
                      <button
                        key={chapter}
                        className={done ? "done" : ""}
                        disabled={view === "both"}
                        onClick={() => toggle(book.id, chapter)}
                        aria-label={`${book.name}${chapter}章 ${done ? "読了済み" : "未読"}`}
                      >
                        {chapter}{done && <small>✓</small>}
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </section>
      {view === "both" && <p className="footer-note">「2人とも」表示は確認専用です。個別表示に切り替えると、過去に読んだ章を手動で登録・解除できます。</p>}
    </>
  );
}
