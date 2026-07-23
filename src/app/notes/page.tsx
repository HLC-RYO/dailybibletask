"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import type { ResearchNote } from "@/lib/types";

export default function NotesPage() {
  const { firebaseUser, memberId, memberNames } = useAppContext();
  const { items: notes, addItem, removeItem } = useHouseholdCollection<ResearchNote>("notes");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [scripture, setScripture] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!q) return sorted;
    return sorted.filter((note) => [note.title, note.scripture, note.body, note.tags.join(" ")].join(" ").toLowerCase().includes(q));
  }, [notes, query]);

  const add = async () => {
    if (!firebaseUser || !title.trim() || !body.trim()) return;
    const now = new Date().toISOString();
    await addItem({
      id: crypto.randomUUID(),
      title: title.trim(),
      scripture: scripture.trim(),
      tags: tags.split(/[,、]/).map((tag) => tag.trim()).filter(Boolean),
      body: body.trim(),
      shared: true,
      author: memberId,
      authorUid: firebaseUser.uid,
      createdAt: now,
      updatedAt: now,
    });
    setTitle("");
    setScripture("");
    setTags("");
    setBody("");
  };

  return (
    <>
      <PageHeader title="研究ノート" subtitle="タイトル・聖句・タグ・本文をまとめて検索できます" />
      <section className="panel"><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例：平和、エレミヤ、大学生" /></section>
      <section className="panel">
        <div className="panel-title"><h2>新しい研究成果</h2></div>
        <div className="form-grid">
          <label>タイトル<input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <div className="form-row">
            <label>関連聖句<input className="input" value={scripture} onChange={(event) => setScripture(event.target.value)} placeholder="マタイ 5:9" /></label>
            <label>タグ<input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="平和、夫婦、伝道" /></label>
          </div>
          <label>内容<textarea className="textarea" value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <button className="button" onClick={add}>共有ノートに保存</button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title"><h2>保存済み {filtered.length}件</h2></div>
        <div className="list">
          {filtered.map((note) => (
            <article className="list-item" key={note.id}>
              <div className="grow">
                <span className="meta">{note.scripture || "聖句未設定"}・{memberNames[note.author]}</span>
                <h3>{note.title}</h3>
                <p>{note.body}</p>
                <div className="button-row">{note.tags.map((tag) => <span className="pill" key={tag}>#{tag}</span>)}</div>
              </div>
              {(note.authorUid === firebaseUser?.uid) && <button className="button danger" onClick={() => removeItem(note.id)}>削除</button>}
            </article>
          ))}
          {!filtered.length && <div className="empty">該当する研究ノートはありません。</div>}
        </div>
      </section>
    </>
  );
}
