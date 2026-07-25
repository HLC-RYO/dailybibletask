"use client";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import type { MinistryItem } from "@/lib/types";

const CATEGORIES = ["紹介の言葉", "ピッタリの聖句", "反対意見", "電話証言サンプル", "手紙証言サンプル"];
type Topic = { id:string; scope:"national"|"local"; title:string; summary:string; source:string; url:string; publishedAt:string };
type TopicsResponse = { updatedAt:string; location:{country:string; municipality:string}; topics:Topic[]; error?:string };

export default function MinistryPage() {
  const { firebaseUser } = useAppContext();
  const { items, addItem, removeItem } = useHouseholdCollection<MinistryItem>("ministryItems");
  const [query,setQuery]=useState(""); const [showForm,setShowForm]=useState(false); const [category,setCategory]=useState(CATEGORIES[0]);
  const [title,setTitle]=useState(""); const [scripture,setScripture]=useState(""); const [link,setLink]=useState(""); const [note,setNote]=useState("");
  const [topics,setTopics]=useState<TopicsResponse|null>(null); const [topicsLoading,setTopicsLoading]=useState(true);

  useEffect(()=>{let cancelled=false; fetch("/api/topics").then(r=>r.json()).then((d:TopicsResponse)=>{if(!cancelled)setTopics(d)}).catch(()=>{if(!cancelled)setTopics(null)}).finally(()=>{if(!cancelled)setTopicsLoading(false)}); return()=>{cancelled=true}},[]);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return items.filter((item)=>!q||[item.title,item.category,item.scripture,item.note].join(" ").toLowerCase().includes(q))},[items,query]);
  const save=async()=>{if(!firebaseUser||!title.trim())return;await addItem({id:crypto.randomUUID(),title:title.trim(),category,scripture:scripture.trim(),link:link.trim(),note:note.trim(),createdAt:new Date().toISOString(),createdBy:firebaseUser.uid});setTitle("");setScripture("");setLink("");setNote("");setShowForm(false)};
  const national=topics?.topics.filter((t)=>t.scope==="national")??[]; const local=topics?.topics.filter((t)=>t.scope==="local")??[];

  return <>
    <PageHeader title="伝道情報" subtitle="証言に使える情報をカテゴリーごとに整理します" />
    <section className="panel workspace-actions"><button className="button" onClick={()=>setShowForm((v)=>!v)}>＋ 新規作成</button><input className="input grow" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="タイトル、聖句、内容から検索" /></section>
    <section className="panel today-topics-panel"><div className="panel-title"><h2>今日の話題</h2><span className="meta">{topics?.updatedAt?`${new Date(topics.updatedAt).toLocaleDateString("ja-JP")}更新`:""}</span></div>
      {topicsLoading?<div className="empty">話題を読み込んでいます…</div>:topics&&topics.topics.length>0?<div className="topic-groups"><div><h3>{topics.location.country}で継続的に関心のある話題</h3><div className="topic-list">{national.map((t)=><a className="topic-card" href={t.url} target="_blank" rel="noreferrer" key={t.id}><span className="topic-scope">国内・{t.summary}</span><strong>{t.title}</strong><small>{t.source}</small></a>)}</div></div><div><h3>{topics.location.municipality}周辺の話題</h3><div className="topic-list">{local.map((t)=><a className="topic-card" href={t.url} target="_blank" rel="noreferrer" key={t.id}><span className="topic-scope">地域・{t.summary}</span><strong>{t.title}</strong><small>{t.source}</small></a>)}</div></div></div>:<div className="empty">今日の話題を取得できませんでした。時間を置いて再度開いてください。</div>}
    </section>
    {showForm&&<section className="panel"><div className="form-grid"><label>カテゴリー<select className="select" value={category} onChange={(e)=>setCategory(e.target.value)}>{CATEGORIES.map((n)=><option key={n}>{n}</option>)}</select></label><label>タイトル<input className="input" value={title} onChange={(e)=>setTitle(e.target.value)} /></label><label>関連聖句<input className="input" value={scripture} onChange={(e)=>setScripture(e.target.value)} /></label><label>参考リンク<input className="input" value={link} onChange={(e)=>setLink(e.target.value)} /></label><label>内容<textarea className="textarea" value={note} onChange={(e)=>setNote(e.target.value)} /></label><button className="button" onClick={save}>保存</button></div></section>}
    {CATEGORIES.map((name)=>{const categoryItems=filtered.filter((item)=>item.category===name);return <section className="panel" key={name}><div className="panel-title"><h2>{name}</h2><span className="meta">{categoryItems.length}件</span></div><div className="list">{categoryItems.map((item)=><article className="list-item" key={item.id}><div className="grow"><h3>{item.title}</h3>{item.scripture&&<p className="meta">{item.scripture}</p>}{item.note&&<p>{item.note}</p>}{item.link&&<a href={item.link} target="_blank" rel="noreferrer">リンクを開く</a>}</div><button className="button danger" onClick={()=>removeItem(item.id)}>削除</button></article>)}{!categoryItems.length&&<div className="empty">まだ情報はありません。</div>}</div></section>})}
  </>;
}
