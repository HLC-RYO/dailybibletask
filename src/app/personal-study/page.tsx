"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import { useUserCollection } from "@/hooks/useUserCollection";
import type { PersonalStudy } from "@/lib/types";

export default function PersonalStudyPage() {
  const { firebaseUser, memberId, memberNames } = useAppContext();
  const privateStudies = useUserCollection<PersonalStudy>("personalStudies");
  const sharedStudies = useHouseholdCollection<PersonalStudy>("sharedPersonalStudies");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [scripture, setScripture] = useState("");
  const [tags, setTags] = useState("");
  const [links, setLinks] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<PersonalStudy["status"]>("draft");
  const [visibility, setVisibility] = useState<"private" | "shared">("private");
  const [busyId, setBusyId] = useState<string | null>(null);

  const allItems = useMemo(() => [
    ...privateStudies.items.map((item) => ({ ...item, visibility: "private" as const })),
    ...sharedStudies.items.map((item) => ({ ...item, visibility: "shared" as const })),
  ], [privateStudies.items, sharedStudies.items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...allItems].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!q) return sorted;
    return sorted.filter((item) => [item.title, item.scripture, item.body, item.tags.join(" "), item.referenceLinks.join(" ")].join(" ").toLowerCase().includes(q));
  }, [allItems, query]);

  const save = async () => {
    if (!firebaseUser || !title.trim() || !body.trim()) return;
    const now = new Date().toISOString();
    const item: PersonalStudy = {
      id: crypto.randomUUID(),
      ownerUid: firebaseUser.uid,
      ownerMemberId: memberId,
      ownerName: memberNames[memberId],
      visibility,
      title: title.trim(),
      body: body.trim(),
      scripture: scripture.trim(),
      tags: tags.split(/[,、]/).map((value) => value.trim()).filter(Boolean),
      referenceLinks: links.split(/\n/).map((value) => value.trim()).filter(Boolean),
      status,
      createdAt: now,
      updatedAt: now,
    };
    if (visibility === "shared") await sharedStudies.addItem(item);
    else await privateStudies.addItem(item);
    setTitle(""); setScripture(""); setTags(""); setLinks(""); setBody(""); setStatus("draft"); setVisibility("private");
  };

  const isOwner = (item: PersonalStudy) => !item.ownerUid || item.ownerUid === firebaseUser?.uid;

  const toggleVisibility = async (item: PersonalStudy) => {
    if (!firebaseUser || !isOwner(item)) return;
    setBusyId(item.id);
    try {
      const updatedAt = new Date().toISOString();
      if (item.visibility === "shared") {
        await privateStudies.addItem({ ...item, visibility: "private", updatedAt });
        await sharedStudies.removeItem(item.id);
      } else {
        await sharedStudies.addItem({
          ...item,
          ownerUid: firebaseUser.uid,
          ownerMemberId: memberId,
          ownerName: memberNames[memberId],
          visibility: "shared",
          updatedAt,
        });
        await privateStudies.removeItem(item.id);
      }
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (item: PersonalStudy) => {
    if (!isOwner(item)) return;
    const patch = { status: item.status === "draft" ? "complete" as const : "draft" as const, updatedAt: new Date().toISOString() };
    if (item.visibility === "shared") await sharedStudies.updateItem(item.id, patch);
    else await privateStudies.updateItem(item.id, patch);
  };

  const remove = async (item: PersonalStudy) => {
    if (!isOwner(item)) return;
    if (item.visibility === "shared") await sharedStudies.removeItem(item.id);
    else await privateStudies.removeItem(item.id);
  };

  return (
    <>
      <PageHeader title="じぶんの研究" subtitle="基本は自分だけ。共有したい研究だけ夫婦で見られます" />

      <section className="panel personal-study-intro">
        <strong>研究ごとに公開範囲を選べます</strong>
        <p>「自分だけ」は本人専用、「夫婦で共有」は相手も閲覧できます。公開範囲は後からいつでも変更できます。</p>
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
          <label>公開範囲<select className="select" value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "shared")}><option value="private">🔒 自分だけ</option><option value="shared">👥 夫婦で共有</option></select></label>
          <label>タグ<input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="例：平和、エレミヤ、話の準備" /></label>
          <label>参考リンク（1行に1つ）<textarea className="textarea compact-textarea" value={links} onChange={(event) => setLinks(event.target.value)} placeholder="https://www.jw.org/..." /></label>
          <label>研究内容<textarea className="textarea personal-study-body" value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <button className="button" onClick={save}>{visibility === "shared" ? "夫婦で共有して保存" : "自分の研究に保存"}</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title"><h2>保存済み {privateStudies.loading || sharedStudies.loading ? "…" : `${filtered.length}件`}</h2></div>
        <div className="list">
          {filtered.map((item) => {
            const owner = isOwner(item);
            return (
              <article className="list-item personal-study-item" key={`${item.visibility}-${item.id}`}>
                <div className="grow">
                  <span className="meta">{item.visibility === "shared" ? "👥 夫婦で共有" : "🔒 自分だけ"}・{item.status === "draft" ? "下書き" : "ひとまず完成"}{item.scripture ? `・${item.scripture}` : ""}</span>
                  <h3>{item.title}</h3>
                  {item.visibility === "shared" && item.ownerName && <small className="meta">作成：{item.ownerName}</small>}
                  <p>{item.body}</p>
                  <div className="button-row">{item.tags.map((tag) => <span className="pill" key={tag}>#{tag}</span>)}</div>
                  {item.referenceLinks.length > 0 && <div className="personal-study-links">{item.referenceLinks.map((link) => <a href={link} target="_blank" rel="noreferrer" key={link}>{link}</a>)}</div>}
                  {owner ? (
                    <div className="button-row">
                      <button className="button secondary" disabled={busyId === item.id} onClick={() => toggleVisibility(item)}>{busyId === item.id ? "変更中…" : item.visibility === "shared" ? "自分だけに戻す" : "夫婦で共有する"}</button>
                      <button className="button secondary" onClick={() => toggleStatus(item)}>{item.status === "draft" ? "完成にする" : "下書きに戻す"}</button>
                      <button className="button danger" onClick={() => remove(item)}>削除</button>
                    </div>
                  ) : <span className="meta">相手が共有した研究です（閲覧のみ）</span>}
                </div>
              </article>
            );
          })}
          {!privateStudies.loading && !sharedStudies.loading && filtered.length === 0 && <div className="empty">まだ研究メモはありません。</div>}
        </div>
      </section>
    </>
  );
}
