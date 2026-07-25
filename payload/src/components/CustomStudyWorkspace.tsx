"use client";

import { useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import { useUserCollection } from "@/hooks/useUserCollection";
import type { StudyCategory, StudyEntry, StudyEntryValues, StudyFieldKey } from "@/lib/types";

const FIELD_OPTIONS: { key: StudyFieldKey; label: string }[] = [
  { key: "title", label: "タイトル欄" },
  { key: "name", label: "名前欄" },
  { key: "year", label: "年号欄" },
  { key: "scripture", label: "聖句欄" },
  { key: "labels", label: "ラベル欄" },
  { key: "links", label: "リンク欄" },
  { key: "memo", label: "メモ欄" },
];

const EMPTY_VALUES: StudyEntryValues = { custom: {} };

export function CustomStudyWorkspace({ scope }: { scope: "personal" | "couple" }) {
  const { firebaseUser, memberId, memberNames } = useAppContext();
  const personalCategories = useUserCollection<StudyCategory>("personalStudyCategories");
  const personalEntries = useUserCollection<StudyEntry>("personalStudyEntries");
  const coupleCategories = useHouseholdCollection<StudyCategory>("coupleStudyCategories");
  const coupleEntries = useHouseholdCollection<StudyEntry>("coupleStudyEntries");
  const sharedPersonalEntries = useHouseholdCollection<StudyEntry>("sharedPersonalStudyEntries");

  const categories = scope === "personal" ? personalCategories : coupleCategories;
  const entries = scope === "personal" ? personalEntries : coupleEntries;

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [enabledFields, setEnabledFields] = useState<StudyFieldKey[]>(["title", "memo"]);
  const [customFields, setCustomFields] = useState(["", "", ""]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [values, setValues] = useState<StudyEntryValues>(EMPTY_VALUES);
  const [visibility, setVisibility] = useState<"private" | "shared">(scope === "couple" ? "shared" : "private");
  const [editing, setEditing] = useState<StudyEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedCategory = categories.items.find((item) => item.id === selectedCategoryId);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries.items) counts.set(entry.categoryId, (counts.get(entry.categoryId) ?? 0) + 1);
    return counts;
  }, [entries.items]);

  const sortedEntries = useMemo(() => [...entries.items]
    .filter((entry) => categoryFilter === "all" || entry.categoryId === categoryFilter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [categoryFilter, entries.items]);

  const saveCategory = async () => {
    if (!categoryName.trim()) return;
    const now = new Date().toISOString();
    await categories.addItem({
      id: crypto.randomUUID(), scope, name: categoryName.trim(), enabledFields,
      customFields: customFields.map((item) => item.trim()).filter(Boolean),
      createdAt: now, updatedAt: now,
    });
    setCategoryName(""); setEnabledFields(["title", "memo"]); setCustomFields(["", "", ""]); setShowCategoryForm(false);
  };

  const saveEntry = async (status: "draft" | "complete") => {
    if (!firebaseUser || !selectedCategory) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const entry: StudyEntry = {
        id: editing?.id ?? crypto.randomUUID(), scope,
        categoryId: selectedCategory.id, categoryName: selectedCategory.name,
        ownerUid: editing?.ownerUid ?? firebaseUser.uid,
        ownerMemberId: editing?.ownerMemberId ?? memberId,
        ownerName: editing?.ownerName ?? memberNames[memberId],
        visibility: scope === "couple" ? "shared" : visibility,
        status, values, createdAt: editing?.createdAt ?? now, updatedAt: now,
      };
      if (editing) await entries.updateItem(entry.id, entry); else await entries.addItem(entry);
      if (scope === "personal") {
        if (entry.visibility === "shared") await sharedPersonalEntries.addItem(entry);
        else await sharedPersonalEntries.removeItem(entry.id);
      }
      setShowEntryForm(false); setEditing(null); setValues(EMPTY_VALUES);
    } finally { setBusy(false); }
  };

  const startNew = (categoryId?: string) => {
    setEditing(null); setSelectedCategoryId(categoryId ?? categories.items[0]?.id ?? "");
    setValues(EMPTY_VALUES); setVisibility(scope === "couple" ? "shared" : "private"); setShowEntryForm(true);
  };

  const startEdit = (entry: StudyEntry) => {
    setEditing(entry); setSelectedCategoryId(entry.categoryId); setValues(entry.values); setVisibility(entry.visibility); setShowEntryForm(true);
  };

  const removeEntry = async (entry: StudyEntry) => {
    await entries.removeItem(entry.id);
    if (scope === "personal") await sharedPersonalEntries.removeItem(entry.id);
  };

  const renderField = (key: StudyFieldKey) => {
    const labels: Record<StudyFieldKey, string> = { title: "タイトル", name: "名前", year: "年号", scripture: "聖句", labels: "ラベル", links: "リンク", memo: "メモ" };
    const multiline = key === "links" || key === "memo";
    return <label key={key}>{labels[key]}{multiline ? <textarea className="textarea" value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} /> : <input className="input" value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />}</label>;
  };

  return <>
    <section className="panel workspace-actions">
      <button className="button" onClick={() => startNew()} disabled={!categories.items.length}>＋ 新規作成</button>
      <button className="button secondary" onClick={() => setShowCategoryForm((v) => !v)}>＋ カテゴリー作成</button>
      {!categories.items.length && <p className="meta">最初にカテゴリーを1つ作成してください。</p>}
      {categories.items.length > 0 && <div className="registered-category-block">
        <span className="meta category-caption">登録済みカテゴリー</span>
        <div className="category-filter-row">
          <button className={`pill-button ${categoryFilter === "all" ? "active" : ""}`} onClick={() => setCategoryFilter("all")}>すべて <small>{entries.items.length}</small></button>
          {[...categories.items].sort((a,b)=>a.name.localeCompare(b.name,"ja")).map((category)=><button className={`pill-button ${categoryFilter === category.id ? "active" : ""}`} key={category.id} onClick={()=>setCategoryFilter(category.id)} onDoubleClick={()=>startNew(category.id)} title="クリックで絞り込み、ダブルクリックで新規作成">{category.name} <small>{categoryCounts.get(category.id) ?? 0}</small></button>)}
        </div>
      </div>}
    </section>

    {showCategoryForm && <section className="panel"><div className="panel-title"><h2>カテゴリー作成</h2></div><div className="form-grid">
      <label>カテゴリー名<input className="input" value={categoryName} onChange={(e)=>setCategoryName(e.target.value)} /></label>
      <div className="field-choice-grid">{FIELD_OPTIONS.map((field)=><label className="check-card" key={field.key}><input type="checkbox" checked={enabledFields.includes(field.key)} onChange={()=>setEnabledFields((current)=>current.includes(field.key)?current.filter((item)=>item!==field.key):[...current,field.key])}/><span>{field.label}</span></label>)}</div>
      <strong>その他の入力欄（最大3つ）</strong>
      {customFields.map((field,index)=><input className="input" key={index} value={field} onChange={(e)=>{const next=[...customFields];next[index]=e.target.value;setCustomFields(next)}} placeholder={`自由入力欄 ${index+1}`} />)}
      <div className="button-row"><button className="button" onClick={saveCategory}>カテゴリーを保存</button><button className="button secondary" onClick={()=>setShowCategoryForm(false)}>閉じる</button></div>
    </div></section>}

    {showEntryForm && <section className="panel"><div className="panel-title"><h2>{editing?"研究を編集":"新しい研究"}</h2></div><div className="form-grid">
      <label>カテゴリー<select className="select" value={selectedCategoryId} onChange={(e)=>{setSelectedCategoryId(e.target.value);setValues(EMPTY_VALUES)}}><option value="">選択してください</option>{categories.items.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      {selectedCategory?.enabledFields.map(renderField)}
      {selectedCategory?.customFields.map((field)=><label key={field}>{field}<textarea className="textarea" value={values.custom?.[field] ?? ""} onChange={(e)=>setValues({...values,custom:{...(values.custom??{}),[field]:e.target.value}})} /></label>)}
      {scope === "personal" && <label>公開範囲<select className="select" value={visibility} onChange={(e)=>setVisibility(e.target.value as "private"|"shared")}><option value="private">🔒 自分だけ</option><option value="shared">👥 家族に共有</option></select></label>}
      <div className="button-row"><button className="button secondary" disabled={busy||!selectedCategory} onClick={()=>saveEntry("draft")}>編集中で保存</button><button className="button" disabled={busy||!selectedCategory} onClick={()=>saveEntry("complete")}>完成として保存</button><button className="button secondary" onClick={()=>setShowEntryForm(false)}>閉じる</button></div>
    </div></section>}

    <section className="panel"><div className="panel-title"><h2>{categoryFilter === "all" ? "保存済み" : categories.items.find((item)=>item.id===categoryFilter)?.name} {entries.loading?"…":`${sortedEntries.length}件`}</h2></div><div className="list">
      {sortedEntries.map((entry)=><article className="list-item" key={entry.id}><div className="grow"><span className="meta">{entry.categoryName}・{entry.status === "draft" ? "編集中" : "完成"}{scope === "personal" ? `・${entry.visibility === "shared" ? "家族に共有" : "自分だけ"}` : ""}</span><h3>{entry.values.title || entry.values.name || entry.categoryName}</h3>{entry.values.scripture && <p className="meta">{entry.values.scripture}</p>}{entry.values.memo && <p>{entry.values.memo}</p>}</div><div className="button-row"><button className="button secondary" onClick={()=>startEdit(entry)}>編集</button><button className="button danger" onClick={()=>removeEntry(entry)}>削除</button></div></article>)}
      {!entries.loading && !sortedEntries.length && <div className="empty">このカテゴリーには、まだ研究がありません。</div>}
    </div></section>
  </>;
}
