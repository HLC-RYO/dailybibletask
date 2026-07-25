"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import type { MinistryItem } from "@/lib/types";

const CATEGORIES = ["紹介の言葉", "ピッタリの聖句", "反対意見", "電話証言サンプル", "手紙証言サンプル"];

export default function MinistryPage() {
  const { firebaseUser } = useAppContext();
  const { items, addItem, removeItem } = useHouseholdCollection<MinistryItem>("ministryItems");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [scripture, setScripture] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) =>
      !q || [item.title, item.category, item.scripture, item.note].join(" ").toLowerCase().includes(q)
    );
  }, [items, query]);

  const save = async () => {
    if (!firebaseUser || !title.trim()) return;
    await addItem({
      id: crypto.randomUUID(),
      title: title.trim(),
      category,
      scripture: scripture.trim(),
      link: link.trim(),
      note: note.trim(),
      createdAt: new Date().toISOString(),
      createdBy: firebaseUser.uid,
    });
    setTitle("");
    setScripture("");
    setLink("");
    setNote("");
    setShowForm(false);
  };

  return (
    <>
      <PageHeader title="伝道情報" subtitle="証言に使える情報をカテゴリーごとに整理します" />
      <section className="panel workspace-actions">
        <button className="button" onClick={() => setShowForm((value) => !value)}>＋ 新規作成</button>
        <input className="input grow" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="タイトル、聖句、内容から検索" />
      </section>

      <section className="panel today-topics-placeholder">
        <div className="panel-title"><h2>今日の話題</h2><span className="meta">準備中</span></div>
        <p>国の話題3件と、市町村の話題2件を、政治・経済・科学・気候・国際情勢などから表示する予定です。</p>
      </section>

      {showForm && (
        <section className="panel">
          <div className="form-grid">
            <label>カテゴリー
              <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <label>タイトル<input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>関連聖句<input className="input" value={scripture} onChange={(event) => setScripture(event.target.value)} /></label>
            <label>参考リンク<input className="input" value={link} onChange={(event) => setLink(event.target.value)} /></label>
            <label>内容<textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} /></label>
            <button className="button" onClick={save}>保存</button>
          </div>
        </section>
      )}

      {CATEGORIES.map((name) => {
        const categoryItems = filtered.filter((item) => item.category === name);
        return (
          <section className="panel" key={name}>
            <div className="panel-title"><h2>{name}</h2><span className="meta">{categoryItems.length}件</span></div>
            <div className="list">
              {categoryItems.map((item) => (
                <article className="list-item" key={item.id}>
                  <div className="grow">
                    <h3>{item.title}</h3>
                    {item.scripture && <p className="meta">{item.scripture}</p>}
                    {item.note && <p>{item.note}</p>}
                    {item.link && <a href={item.link} target="_blank" rel="noreferrer">リンクを開く</a>}
                  </div>
                  <button className="button danger" onClick={() => removeItem(item.id)}>削除</button>
                </article>
              ))}
              {!categoryItems.length && <div className="empty">まだ情報はありません。</div>}
            </div>
          </section>
        );
      })}
    </>
  );
}