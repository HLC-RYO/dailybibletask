"use client";

import { DogCompanion } from "@/components/DogCompanion";
import { FeatureCard } from "@/components/FeatureCard";
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
  const companionStats = getCompanionStats(reading, presence);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Together, one chapter a day</p>
        <h1>宝を探そう</h1>
        <p>毎日の1章を、無理なく。夫婦で学んだことを積み重ね、必要な時にすぐ見つけられる場所です。</p>
      </section>

      <DogCompanion name={companion.name} stats={companionStats} />

      {partnerPresence && (
        <section className="live-reading-banner" aria-live="polite">
          <span className="live-dot" />
          <div>
            <strong>{memberNames[partnerId]}が今読んでいます</strong>
            <span>{formatChapter(partnerPresence.ref)}・{new Date(partnerPresence.startedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}開始</span>
          </div>
        </section>
      )}

      <section className="today-card">
        <small>{memberNames[memberId]}さんの今日の1章</small>
        <h2>{loading ? "読み込み中…" : formatChapter(next.ref)}</h2>
        <p>{next.mode === "meeting" ? `今週の集会範囲 ${next.meetingIndex}/${next.meetingTotal}` : "通常通読の続き"}</p>
        <a href="/reading" className="button">聖書の旅を開く</a>
      </section>

      <section className="feature-grid" aria-label="機能一覧">
        <FeatureCard href="/reading" icon="📖" title="聖書通読" description="集会範囲を優先し、終わったら通常通読へ戻ります" meta="1日1章" />
        <FeatureCard href="/study" icon="🤝" title="夫婦の研究" description="週1回の予定・準備・振り返りを共有します" />
        <FeatureCard href="/notes" icon="💎" title="研究ノート" description="聖句・タグ・全文から研究成果をすぐ検索します" />
        <FeatureCard href="/ministry" icon="🗣️" title="伝道資料" description="話題、例え、聖句、jw.orgリンクを整理します" />
        <FeatureCard href="/tasks" icon="✅" title="タスク" description="個人または夫婦共有の用事を管理します" />
        <FeatureCard href="/settings" icon="⚙️" title="設定" description="招待、通読位置、ワンちゃんの名前を変更します" />
      </section>

      <p className="footer-note">データはFirebaseへ保存され、2人の端末にリアルタイムで反映されます。</p>
    </>
  );
}
