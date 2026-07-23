"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import type { MinistryItem } from "@/lib/types";

export default function MinistryPage() {
  const { firebaseUser } = useAppContext();
  const { items, addItem, removeItem } = useHouseholdCollection<MinistryItem>("ministryItems");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("会話の始め方");
  const [scripture, setScripture] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const sorted = useMemo(() => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [items]);

  const add = async () => {
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
  };

  return (
    <>
      <PageHeader title="伝道資料" subtitle="役立った話題・例え・聖句・公式リンクを蓄積します" />
      <section className="panel">
        <div className="panel-title"><h2>情報を追加</h2></div>
        <div className="form-grid">
          <label>タイトル<input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <div className="form-row">
            <label>分類
              <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>会話の始め方</option><option>よくある質問</option><option>分かりやすい例え</option><option>再訪問テーマ</option><option>聖句</option>
              </select>
            </label>
            <label>関連聖句<input className="input" value={scripture} onChange={(event) => setScripture(event.target.value)} /></label>
          </div>
          <label>jw.orgリンク<input className="input" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://www.jw.org/..." /></label>
          <label>メモ<textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <button className="button" onClick={add}>保存</button>
        </div>
      </section>
      <section className="panel">
        <div className="list">
          {sorted.map((item) => (
            <article className="list-item" key={item.id}>
              <div className="grow">
                <span className="meta">{item.category} {item.scripture && `・${item.scripture}`}</span>
                <h3>{item.title}</h3>
                {item.note && <p>{item.note}</p>}
                {item.link && <a className="pill" href={item.link} target="_blank" rel="noreferrer">公式ページを開く</a>}
              </div>
              {item.createdBy === firebaseUser?.uid && <button className="button danger" onClick={() => removeItem(item.id)}>削除</button>}
            </article>
          ))}
          {!items.length && <div className="empty">伝道でまた使いたい情報を保存してみましょう。</div>}
        </div>
      </section>
    </>
  );
}
