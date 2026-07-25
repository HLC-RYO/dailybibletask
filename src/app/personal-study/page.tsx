"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useUserCollection } from "@/hooks/useUserCollection";
import type { PersonalStudy } from "@/lib/types";

export default function PersonalStudyPage() {
  const { items, loading, addItem, updateItem, removeItem } = useUserCollection<PersonalStudy>("personalStudies");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [scripture, setScripture] = useState("");
  const [tags, setTags] = useState("");
  const [links, setLinks] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<PersonalStudy["status"]>("draft");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!q) return sorted;
    return sorted.filter((item) => [item.title, item.scripture, item.body, item.tags.join(" "), item.referenceLinks.join(" ")].join(" ").toLowerCase().includes(q));
  }, [items, query]);

  const save = async () => {
    if (!title.trim() || !body.trim()) return;
    const now = new Date().toISOString();
    await addItem({
      id: crypto.randomUUID(),
      title: title.trim(),
      body: body.trim(),
      scripture: scripture.trim(),
      tags: tags.split(/[,、]/).map((value) => value.trim()).filter(Boolean),
      referenceLinks: links.split(/\n/).map((value) => value.trim()).filter(Boolean),
      status,
      createdAt: now,
      updatedAt: now,
    });
    setTitle(""); setScripture(""); setTags(""); setLinks(""); setBody(""); setStatus("draft");
  };

  return (
    <>
      <PageHeader title="じぶんの研究" subtitle="下書きや資料を、自分だけの場所に保存できます" />

      <section className="panel personal-study-intro">
        <strong>このページの内容は夫婦共有されません</strong>
        <p>今後の改良に備えて、共有研究・研究ノート・伝道資料とは別のデータとして保存します。</p>
      </section>

      <section className="panel">
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="タイトル、聖句、タグ、本文から検索" />
      </section>

      <section className="panel">
        <div className="panel-title"><h2>新しい研究メモ</h2></div>
        <div className="form-grid">
          <label>タイトル<input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <div className="form-row">
            <label>関連聖句<input className="input" value={scripture} onChange={(event) => setScripture(event.target.value)} placeholder="例：マタイ 5:9" /></label>
            <label>状態<select className="select" value={status} onChange={(event) => setStatus(event.target.value as PersonalStudy["status"])}><option value="draft">下書き</option><option value="complete">ひとまず完成</option></select></label>
          </div>
          <label>タグ<input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="例：平和、エレミヤ、話の準備" /></label>
          <label>参考リンク（1行に1つ）<textarea className="textarea compact-textarea" value={links} onChange={(event) => setLinks(event.target.value)} placeholder="https://www.jw.org/..." /></label>
          <label>研究内容<textarea className="textarea personal-study-body" value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <button className="button" onClick={save}>自分の研究に保存</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title"><h2>保存済み {loading ? "…" : `${filtered.length}件`}</h2></div>
        <div className="list">
          {filtered.map((item) => (
            <article className="list-item personal-study-item" key={item.id}>
              <div className="grow">
                <span className="meta">{item.status === "draft" ? "下書き" : "ひとまず完成"}{item.scripture ? `・${item.scripture}` : ""}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <div className="button-row">{item.tags.map((tag) => <span className="pill" key={tag}>#{tag}</span>)}</div>
                {item.referenceLinks.length > 0 && <div className="personal-study-links">{item.referenceLinks.map((link) => <a href={link} target="_blank" rel="noreferrer" key={link}>{link}</a>)}</div>}
                <div className="button-row">
                  <button className="button secondary" onClick={() => updateItem(item.id, { status: item.status === "draft" ? "complete" : "draft", updatedAt: new Date().toISOString() })}>{item.status === "draft" ? "完成にする" : "下書きに戻す"}</button>
                  <button className="button danger" onClick={() => removeItem(item.id)}>削除</button>
                </div>
              </div>
            </article>
          ))}
          {!loading && filtered.length === 0 && <div className="empty">まだ研究メモはありません。</div>}
        </div>
      </section>
    </>
  );
}
