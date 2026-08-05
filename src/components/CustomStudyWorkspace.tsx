"use client";

import { useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import { useUserCollection } from "@/hooks/useUserCollection";
import type { StudyCategory, StudyEntry, StudyEntryValues, StudyFieldKey } from "@/lib/types";

const FIELD_OPTIONS: { key: StudyFieldKey; label: string }[] = [
  { key: "title", label: "タイトル欄" }, { key: "name", label: "名前欄" },
  { key: "year", label: "年号欄" }, { key: "scripture", label: "聖句欄" },
  { key: "labels", label: "ラベル欄" }, { key: "links", label: "リンク欄" },
  { key: "memo", label: "メモ欄" },
];

const EMPTY_VALUES: StudyEntryValues = { custom: {} };

const STUDY_FIELD_ORDER: StudyFieldKey[] = [
  "title",
  "name",
  "year",
  "scripture",
  "labels",
  "links",
  "memo",
];

function orderStudyFields(fields: StudyFieldKey[]): StudyFieldKey[] {
  return STUDY_FIELD_ORDER.filter((field) => fields.includes(field));
}

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
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [managingCategory, setManagingCategory] = useState<StudyCategory | null>(null);
  const [manageName, setManageName] = useState("");
  const [manageFields, setManageFields] = useState<StudyFieldKey[]>([]);
  const [manageCustomFields, setManageCustomFields] = useState(["", "", ""]);

  const selectedCategory = categories.items.find((item) => item.id === selectedCategoryId);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries.items) counts.set(entry.categoryId, (counts.get(entry.categoryId) ?? 0) + 1);
    return counts;
  }, [entries.items]);

  const sortedEntries = useMemo(() => [...entries.items]
    .filter((entry) => categoryFilter === "all" || entry.categoryId === categoryFilter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [categoryFilter, entries.items]);

  const makeId = () => typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `category-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const saveCategory = async () => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) return setCategoryMessage("カテゴリー名を入力してください。");
    setCategoryBusy(true); setCategoryMessage("");
    try {
      const now = new Date().toISOString();
      const category: StudyCategory = {
        id: makeId(), scope, name: trimmedName,
        enabledFields: enabledFields.length ? enabledFields : ["title", "memo"],
        customFields: customFields.map((item) => item.trim()).filter(Boolean),
        createdAt: now, updatedAt: now,
      };
      if (scope === "personal") {
        if (!firebaseUser) throw new Error("ログイン情報を確認できません");
        await personalCategories.addItem(category);
      } else {
        await coupleCategories.addItem(category);
      }
      setCategoryName(""); setEnabledFields(["title", "memo"]); setCustomFields(["", "", ""]);
      setShowCategoryForm(false); setCategoryMessage(`「${trimmedName}」を登録しました。`);
    } catch (error) {
      setCategoryMessage(`カテゴリーを保存できませんでした：${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally { setCategoryBusy(false); }
  };

  const openManager = (category: StudyCategory) => {
    setManagingCategory(category); setManageName(category.name);
    setManageFields(category.enabledFields); setManageCustomFields([...category.customFields, "", "", ""].slice(0, 3));
    setCategoryMessage("");
  };

  const saveCategoryChanges = async () => {
    if (!managingCategory || !manageName.trim()) return;
    setCategoryBusy(true);
    try {
      const updated: StudyCategory = {
        ...managingCategory, name: manageName.trim(),
        enabledFields: manageFields.length ? manageFields : ["title", "memo"],
        customFields: manageCustomFields.map((v) => v.trim()).filter(Boolean),
        updatedAt: new Date().toISOString(),
      };
      await categories.updateItem(updated.id, updated);
      const affected = entries.items.filter((e) => e.categoryId === updated.id);
      for (const entry of affected) {
        const next = { ...entry, categoryName: updated.name, updatedAt: new Date().toISOString() };
        await entries.updateItem(entry.id, next);
        if (scope === "personal" && next.visibility === "shared") await sharedPersonalEntries.updateItem(next.id, next);
      }
      setManagingCategory(null); setCategoryMessage(`「${updated.name}」を更新しました。`);
    } catch (error) {
      setCategoryMessage(`更新できませんでした：${error instanceof Error ? error.message : "不明なエラー"}`);
    } finally { setCategoryBusy(false); }
  };

  const deleteManagedCategory = async () => {
    if (!managingCategory) return;
    const affected = entries.items.filter((e) => e.categoryId === managingCategory.id);
    const others = categories.items.filter((c) => c.id !== managingCategory.id);

    if (affected.length === 0) {
      if (!confirm(`「${managingCategory.name}」を削除しますか？`)) return;
      await categories.removeItem(managingCategory.id);
      setManagingCategory(null); setCategoryFilter("all");
      return setCategoryMessage(`「${managingCategory.name}」を削除しました。`);
    }

    const action = prompt(
      `「${managingCategory.name}」には${affected.length}件あります。\n\n` +
      `1：別のカテゴリーへ移動\n2：研究もまとめて削除\n\n1か2を入力してください。`
    );
    if (action === "1") {
      if (!others.length) return setCategoryMessage("移動先カテゴリーがありません。先に別のカテゴリーを作成してください。");
      const choices = others.map((c, i) => `${i + 1}：${c.name}`).join("\n");
      const selected = Number(prompt(`移動先を選んでください。\n\n${choices}`));
      const target = others[selected - 1];
      if (!target) return;
      setCategoryBusy(true);
      try {
        for (const entry of affected) {
          const next = { ...entry, categoryId: target.id, categoryName: target.name, updatedAt: new Date().toISOString() };
          await entries.updateItem(entry.id, next);
          if (scope === "personal" && next.visibility === "shared") await sharedPersonalEntries.updateItem(next.id, next);
        }
        await categories.removeItem(managingCategory.id);
        setManagingCategory(null); setCategoryFilter("all");
        setCategoryMessage(`${affected.length}件を「${target.name}」へ移動し、カテゴリーを削除しました。`);
      } finally { setCategoryBusy(false); }
      return;
    }
    if (action === "2") {
      if (!confirm(`${affected.length}件の研究もすべて削除します。元に戻せません。続けますか？`)) return;
      setCategoryBusy(true);
      try {
        for (const entry of affected) {
          await entries.removeItem(entry.id);
          if (scope === "personal") await sharedPersonalEntries.removeItem(entry.id);
        }
        await categories.removeItem(managingCategory.id);
        setManagingCategory(null); setCategoryFilter("all");
        setCategoryMessage(`カテゴリーと${affected.length}件の研究を削除しました。`);
      } finally { setCategoryBusy(false); }
    }
  };

  const saveEntry = async (status: "draft" | "complete") => {
    if (!firebaseUser || !selectedCategory) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const entry: StudyEntry = {
        id: editing?.id ?? makeId(), scope, categoryId: selectedCategory.id, categoryName: selectedCategory.name,
        ownerUid: editing?.ownerUid ?? firebaseUser.uid, ownerMemberId: editing?.ownerMemberId ?? memberId,
        ownerName: editing?.ownerName ?? memberNames[memberId], visibility: scope === "couple" ? "shared" : visibility,
        status, values, createdAt: editing?.createdAt ?? now, updatedAt: now,
      };
      if (editing) await entries.updateItem(entry.id, entry); else await entries.addItem(entry);
      if (scope === "personal") {
        if (entry.visibility === "shared") {
          if (editing) await sharedPersonalEntries.updateItem(entry.id, entry);
          else await sharedPersonalEntries.addItem(entry);
        } else await sharedPersonalEntries.removeItem(entry.id);
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
    if (!confirm("この研究を削除しますか？")) return;
    await entries.removeItem(entry.id);
    if (scope === "personal") await sharedPersonalEntries.removeItem(entry.id);
  };
  const renderField = (key: StudyFieldKey) => {
    const labels: Record<StudyFieldKey, string> = { title:"タイトル",name:"名前",year:"年号",scripture:"聖句",labels:"ラベル",links:"リンク",memo:"メモ" };
    const multiline = key === "links" || key === "memo";
    return <label key={key}>{labels[key]}{multiline
      ? <textarea className="textarea" value={values[key] ?? ""} onChange={(e)=>setValues({...values,[key]:e.target.value})}/>
      : <input className="input" value={values[key] ?? ""} onChange={(e)=>setValues({...values,[key]:e.target.value})}/>}</label>;
  };

  return <>
    <section className="panel workspace-actions">
      <button className="button" onClick={()=>startNew()} disabled={!categories.items.length}>＋ 新規作成</button>
      <button className="button secondary" onClick={()=>setShowCategoryForm(v=>!v)}>＋ カテゴリー作成</button>
      {!categories.items.length && <p className="meta">最初にカテゴリーを1つ作成してください。</p>}
      {categoryMessage && <p className={categoryMessage.includes("できません") ? "meta save-error" : "meta save-success"}>{categoryMessage}</p>}
      {!!categories.items.length && <div className="registered-category-block">
        <span className="meta category-caption">登録済みカテゴリー</span>
        <div className="category-filter-row">
          <button className={`pill-button ${categoryFilter==="all"?"active":""}`} onClick={()=>setCategoryFilter("all")}>すべて <small>{entries.items.length}</small></button>
          {[...categories.items].sort((a,b)=>a.name.localeCompare(b.name,"ja")).map(category=>
            <span className="category-pill-wrap" key={category.id}>
              <button className={`pill-button ${categoryFilter===category.id?"active":""}`} onClick={()=>setCategoryFilter(category.id)}>{category.name} <small>{categoryCounts.get(category.id)??0}</small></button>
              <button className="category-menu-button" aria-label={`${category.name}を管理`} onClick={()=>openManager(category)}>…</button>
            </span>
          )}
        </div>
      </div>}
    </section>

    {showCategoryForm && <section className="panel"><h2>カテゴリー作成</h2><div className="form-grid">
      <label>カテゴリー名<input className="input" value={categoryName} onChange={(e)=>setCategoryName(e.target.value)}/></label>
      <div className="field-choice-grid">{FIELD_OPTIONS.map(field=><label className="check-card" key={field.key}><input type="checkbox" checked={enabledFields.includes(field.key)} onChange={()=>setEnabledFields(c=>c.includes(field.key)?c.filter(x=>x!==field.key):[...c,field.key])}/><span>{field.label}</span></label>)}</div>
      <strong>その他の入力欄（最大3つ）</strong>
      {customFields.map((field,index)=><input className="input" key={index} value={field} onChange={(e)=>{const n=[...customFields];n[index]=e.target.value;setCustomFields(n)}}/>)}
      <div className="button-row"><button className="button" disabled={categoryBusy} onClick={saveCategory}>{categoryBusy?"保存中…":"カテゴリーを保存"}</button><button className="button secondary" onClick={()=>setShowCategoryForm(false)}>閉じる</button></div>
    </div></section>}

    {managingCategory && <section className="panel category-manager"><div className="panel-title"><h2>カテゴリーを管理</h2><button className="button secondary" onClick={()=>setManagingCategory(null)}>閉じる</button></div>
      <div className="form-grid">
        <label>カテゴリー名<input className="input" value={manageName} onChange={(e)=>setManageName(e.target.value)}/></label>
        <div className="field-choice-grid">{FIELD_OPTIONS.map(field=><label className="check-card" key={field.key}><input type="checkbox" checked={manageFields.includes(field.key)} onChange={()=>setManageFields(c=>c.includes(field.key)?c.filter(x=>x!==field.key):[...c,field.key])}/><span>{field.label}</span></label>)}</div>
        <strong>その他の入力欄（最大3つ）</strong>
        {manageCustomFields.map((field,index)=><input className="input" key={index} value={field} onChange={(e)=>{const n=[...manageCustomFields];n[index]=e.target.value;setManageCustomFields(n)}}/>)}
        <p className="meta">このカテゴリーの研究：{categoryCounts.get(managingCategory.id)??0}件</p>
        <div className="button-row"><button className="button" disabled={categoryBusy} onClick={saveCategoryChanges}>変更を保存</button><button className="button danger" disabled={categoryBusy} onClick={deleteManagedCategory}>カテゴリーを削除</button></div>
      </div>
    </section>}

    {showEntryForm && <section className="panel"><h2>{editing?"研究を編集":"新しい研究"}</h2><div className="form-grid">
      <label>カテゴリー<select className="select" value={selectedCategoryId} onChange={(e)=>{setSelectedCategoryId(e.target.value);setValues(EMPTY_VALUES)}}><option value="">選択してください</option>{categories.items.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {selectedCategory && orderStudyFields(selectedCategory.enabledFields).map(renderField)}
      {selectedCategory?.customFields.map(field=><label key={field}>{field}<textarea className="textarea" value={values.custom?.[field]??""} onChange={(e)=>setValues({...values,custom:{...(values.custom??{}),[field]:e.target.value}})}/></label>)}
      {scope==="personal"&&<label>公開範囲<select className="select" value={visibility} onChange={(e)=>setVisibility(e.target.value as "private"|"shared")}><option value="private">🔒 自分だけ</option><option value="shared">👥 家族に共有</option></select></label>}
      <div className="button-row"><button className="button secondary" disabled={busy||!selectedCategory} onClick={()=>saveEntry("draft")}>編集中で保存</button><button className="button" disabled={busy||!selectedCategory} onClick={()=>saveEntry("complete")}>完成として保存</button><button className="button secondary" onClick={()=>setShowEntryForm(false)}>閉じる</button></div>
    </div></section>}

    <section className="panel"><div className="panel-title"><h2>{categoryFilter==="all"?"保存済み":categories.items.find(i=>i.id===categoryFilter)?.name} {entries.loading?"…":`${sortedEntries.length}件`}</h2></div><div className="list">
      {sortedEntries.map(entry=><article className="list-item" key={entry.id}><div className="grow"><span className="meta">{entry.categoryName}・{entry.status==="draft"?"編集中":"完成"}</span><h3>{entry.values.title||entry.values.name||entry.categoryName}</h3>{entry.values.memo&&<p>{entry.values.memo}</p>}</div><div className="button-row"><button className="button secondary" onClick={()=>startEdit(entry)}>編集</button><button className="button danger" onClick={()=>removeEntry(entry)}>削除</button></div></article>)}
      {!entries.loading&&!sortedEntries.length&&<div className="empty">このカテゴリーには、まだ研究がありません。</div>}
    </div></section>
  </>;
}

