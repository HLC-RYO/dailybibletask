"use client";

import { useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import { useUserCollection } from "@/hooks/useUserCollection";
import type { StudyCategory, StudyEntry, StudyEntryValues, StudyFieldKey } from "@/lib/study-models";

const FIELDS: { key: StudyFieldKey; label: string }[] = [
  ["title", "タイトル欄"], ["name", "名前欄"], ["year", "年号欄"], ["scripture", "聖句欄"],
  ["labels", "ラベル欄"], ["links", "リンク欄"], ["memo", "メモ欄"],
].map(([key, label]) => ({ key: key as StudyFieldKey, label }));

export function CustomStudyWorkspace({ scope }: { scope: "personal" | "couple" }) {
  const { firebaseUser, memberId, memberNames } = useAppContext();
  const personalCategories = useUserCollection<StudyCategory>("personalStudyCategories");
  const personalEntries = useUserCollection<StudyEntry>("personalStudyEntries");
  const coupleCategories = useHouseholdCollection<StudyCategory>("coupleStudyCategories");
  const coupleEntries = useHouseholdCollection<StudyEntry>("coupleStudyEntries");
  const sharedPersonal = useHouseholdCollection<StudyEntry>("sharedPersonalStudyEntries");

  const categories = scope === "personal" ? personalCategories : coupleCategories;
  const entries = scope === "personal" ? personalEntries : coupleEntries;
  const [showCategory, setShowCategory] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [enabledFields, setEnabledFields] = useState<StudyFieldKey[]>(["title", "memo"]);
  const [customFields, setCustomFields] = useState(["", "", ""]);
  const [categoryId, setCategoryId] = useState("");
  const [values, setValues] = useState<StudyEntryValues>({ custom: {} });
  const [visibility, setVisibility] = useState<"private" | "shared">(scope === "couple" ? "shared" : "private");
  const [editing, setEditing] = useState<StudyEntry | null>(null);

  const category = categories.items.find((item) => item.id === categoryId);
  const sorted = useMemo(() => [...entries.items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [entries.items]);

  const saveCategory = async () => {
    if (!categoryName.trim()) return;
    const now = new Date().toISOString();
    await categories.addItem({
      id: crypto.randomUUID(), scope, name: categoryName.trim(), enabledFields,
      customFields: customFields.map((v) => v.trim()).filter(Boolean), createdAt: now, updatedAt: now,
    });
    setCategoryName(""); setCustomFields(["", "", ""]); setShowCategory(false);
  };

  const startNew = () => {
    setEditing(null); setCategoryId(categories.items[0]?.id ?? ""); setValues({ custom: {} });
    setVisibility(scope === "couple" ? "shared" : "private"); setShowEntry(true);
  };

  const saveEntry = async (status: "draft" | "complete") => {
    if (!firebaseUser || !category) return;
    const now = new Date().toISOString();
    const item: StudyEntry = {
      id: editing?.id ?? crypto.randomUUID(), scope, categoryId: category.id, categoryName: category.name,
      ownerUid: editing?.ownerUid ?? firebaseUser.uid, ownerMemberId: editing?.ownerMemberId ?? memberId,
      ownerName: editing?.ownerName ?? memberNames[memberId], visibility: scope === "couple" ? "shared" : visibility,
      status, values, createdAt: editing?.createdAt ?? now, updatedAt: now,
    };
    if (editing) await entries.updateItem(item.id, item); else await entries.addItem(item);
    if (scope === "personal") {
      if (item.visibility === "shared") await sharedPersonal.addItem(item); else await sharedPersonal.removeItem(item.id);
    }
    setShowEntry(false); setEditing(null); setValues({ custom: {} });
  };

  const edit = (item: StudyEntry) => {
    setEditing(item); setCategoryId(item.categoryId); setValues(item.values); setVisibility(item.visibility); setShowEntry(true);
  };

  const remove = async (item: StudyEntry) => {
    await entries.removeItem(item.id);
    if (scope === "personal") await sharedPersonal.removeItem(item.id);
  };

  const renderField = (key: StudyFieldKey) => {
    const labels: Record<StudyFieldKey, string> = { title: "タイトル", name: "名前", year: "年号", scripture: "聖句", labels: "ラベル", links: "リンク", memo: "メモ" };
    const textarea = key === "memo" || key === "links";
    return <label key={key}>{labels[key]}{textarea
      ? <textarea className="textarea" value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />
      : <input className="input" value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />}</label>;
  };

  return <>
    <section className="panel workspace-actions">
      <button className="button" onClick={startNew} disabled={!categories.items.length}>＋ 新規作成</button>
      <button className="button secondary" onClick={() => setShowCategory((v) => !v)}>＋ カテゴリー作成</button>
      {!categories.items.length && <span className="meta">最初にカテゴリーを作成してください。</span>}
    </section>

    {showCategory && <section className="panel"><div className="panel-title"><h2>カテゴリー作成</h2></div><div className="form-grid">
      <label>カテゴリー名<input className="input" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} /></label>
      <div className="field-choice-grid">{FIELDS.map((f) => <label className="check-card" key={f.key}><input type="checkbox" checked={enabledFields.includes(f.key)} onChange={() => setEnabledFields((current) => current.includes(f.key) ? current.filter((x) => x !== f.key) : [...current, f.key])} />{f.label}</label>)}</div>
      <strong>その他の入力欄（最大3つ）</strong>
      {customFields.map((v, i) => <input className="input" key={i} value={v} placeholder={`自由入力欄 ${i + 1}`} onChange={(e) => { const next=[...customFields]; next[i]=e.target.value; setCustomFields(next); }} />)}
      <div className="button-row"><button className="button" onClick={saveCategory}>保存</button><button className="button secondary" onClick={() => setShowCategory(false)}>閉じる</button></div>
    </div></section>}

    {showEntry && <section className="panel"><div className="panel-title"><h2>{editing ? "研究を編集" : "新しい研究"}</h2></div><div className="form-grid">
      <label>カテゴリー<select className="select" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setValues({ custom: {} }); }}><option value="">選択</option>{categories.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {category?.enabledFields.map(renderField)}
      {category?.customFields.map((name) => <label key={name}>{name}<textarea className="textarea" value={values.custom?.[name] ?? ""} onChange={(e) => setValues({ ...values, custom: { ...(values.custom ?? {}), [name]: e.target.value } })} /></label>)}
      {scope === "personal" && <label>公開範囲<select className="select" value={visibility} onChange={(e) => setVisibility(e.target.value as "private" | "shared")}><option value="private">🔒 自分だけ</option><option value="shared">👥 家族に共有</option></select></label>}
      <div className="button-row"><button className="button secondary" disabled={!category} onClick={() => saveEntry("draft")}>編集中で保存</button><button className="button" disabled={!category} onClick={() => saveEntry("complete")}>完成として保存</button><button className="button secondary" onClick={() => setShowEntry(false)}>閉じる</button></div>
    </div></section>}

    <section className="panel"><div className="panel-title"><h2>保存済み {entries.loading ? "…" : `${sorted.length}件`}</h2></div><div className="list">
      {sorted.map((item) => <article className="list-item" key={item.id}><div className="grow"><span className="meta">{item.categoryName}・{item.status === "draft" ? "編集中" : "完成"}{scope === "personal" ? `・${item.visibility === "shared" ? "家族に共有" : "自分だけ"}` : ""}</span><h3>{item.values.title || item.values.name || item.categoryName}</h3>{item.values.scripture && <p className="meta">{item.values.scripture}</p>}{item.values.memo && <p>{item.values.memo}</p>}</div><div className="button-row"><button className="button secondary" onClick={() => edit(item)}>編集</button><button className="button danger" onClick={() => remove(item)}>削除</button></div></article>)}
      {!entries.loading && !sorted.length && <div className="empty">まだ保存された研究はありません。</div>}
    </div></section>
  </>;
}
