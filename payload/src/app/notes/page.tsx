"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import { useUserCollection } from "@/hooks/useUserCollection";
import type { StudyEntry } from "@/lib/types";

function searchable(entry: StudyEntry): string {
  return [
    entry.categoryName,
    entry.values.title,
    entry.values.name,
    entry.values.year,
    entry.values.scripture,
    entry.values.labels,
    entry.values.links,
    entry.values.memo,
    ...Object.values(entry.values.custom ?? {}),
  ].filter(Boolean).join(" ").toLowerCase();
}

export default function NotesPage() {
  const { firebaseUser } = useAppContext();
  const personal = useUserCollection<StudyEntry>("personalStudyEntries");
  const sharedPersonal = useHouseholdCollection<StudyEntry>("sharedPersonalStudyEntries");
  const couple = useHouseholdCollection<StudyEntry>("coupleStudyEntries");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("すべて");

  const visible = useMemo(() => {
    const partnerShared = sharedPersonal.items.filter((item) => item.ownerUid !== firebaseUser?.uid);
    return [...personal.items, ...partnerShared, ...couple.items]
      .filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index);
  }, [couple.items, firebaseUser?.uid, personal.items, sharedPersonal.items]);

  const categories = useMemo(
    () => Array.from(new Set(visible.map((item) => item.categoryName))).sort(),
    [visible],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible
      .filter((item) => category === "すべて" || item.categoryName === category)
      .filter((item) => !q || searchable(item).includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [category, query, visible]);

  return (
    <>
      <PageHeader title="研究ノート" subtitle="じぶんの研究とふたりの研究をまとめて検索できます" />
      <section className="panel">
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="タイトル、名前、聖句、ラベル、メモから検索" />
        <div className="category-filter-row">
          <button className={`pill-button ${category === "すべて" ? "active" : ""}`} onClick={() => setCategory("すべて")}>すべて</button>
          {categories.map((name) => (
            <button className={`pill-button ${category === name ? "active" : ""}`} key={name} onClick={() => setCategory(name)}>{name}</button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title"><h2>{filtered.length}件</h2></div>
        <div className="list">
          {filtered.map((entry) => {
            const canEdit = entry.scope === "couple" || entry.ownerUid === firebaseUser?.uid;
            return (
              <article className="list-item research-note-card" key={entry.id}>
                <div className="grow">
                  <span className="meta">{entry.categoryName}・{entry.scope === "couple" ? "ふたりの研究" : "じぶんの研究"}・{entry.status === "draft" ? "編集中" : "完成"}</span>
                  <h3>{entry.values.title || entry.values.name || entry.categoryName}</h3>
                  {entry.values.name && entry.values.title && <p><strong>名前：</strong>{entry.values.name}</p>}
                  {entry.values.year && <p><strong>年号：</strong>{entry.values.year}</p>}
                  {entry.values.scripture && <p><strong>聖句：</strong>{entry.values.scripture}</p>}
                  {entry.values.labels && <p><strong>ラベル：</strong>{entry.values.labels}</p>}
                  {entry.values.memo && <p>{entry.values.memo}</p>}
                  {Object.entries(entry.values.custom ?? {}).map(([key, value]) =>
                    value ? <p key={key}><strong>{key}：</strong>{value}</p> : null
                  )}
                  {entry.values.links && <a href={entry.values.links.split(/\s+/)[0]} target="_blank" rel="noreferrer">参考リンクを開く</a>}
                  {!canEdit && <p className="meta">相手が共有した研究です（閲覧のみ）</p>}
                </div>
              </article>
            );
          })}
          {!personal.loading && !sharedPersonal.loading && !couple.loading && !filtered.length && <div className="empty">表示できる研究ノートはありません。</div>}
        </div>
      </section>
    </>
  );
}