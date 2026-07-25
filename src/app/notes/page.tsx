"use client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import { useUserCollection } from "@/hooks/useUserCollection";
import type { StudyEntry } from "@/lib/study-models";

const textOf=(e:StudyEntry)=>[e.categoryName,e.values.title,e.values.name,e.values.year,e.values.scripture,e.values.labels,e.values.links,e.values.memo,...Object.values(e.values.custom??{})].filter(Boolean).join(" ").toLowerCase();
export default function NotesPage(){
 const {firebaseUser}=useAppContext();
 const personal=useUserCollection<StudyEntry>("personalStudyEntries");
 const shared=useHouseholdCollection<StudyEntry>("sharedPersonalStudyEntries");
 const couple=useHouseholdCollection<StudyEntry>("coupleStudyEntries");
 const [query,setQuery]=useState(""); const [category,setCategory]=useState("すべて");
 const visible=useMemo(()=>{
   const partner=shared.items.filter(i=>i.ownerUid!==firebaseUser?.uid);
   const all=[...personal.items,...partner,...couple.items];
   return all.filter((i,n,a)=>a.findIndex(x=>x.id===i.id)===n);
 },[personal.items,shared.items,couple.items,firebaseUser?.uid]);
 const categories=useMemo(()=>Array.from(new Set(visible.map(i=>i.categoryName))).sort(),[visible]);
 const filtered=useMemo(()=>visible.filter(i=>(category==="すべて"||i.categoryName===category)&&(!query.trim()||textOf(i).includes(query.trim().toLowerCase()))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),[visible,category,query]);
 return <><PageHeader title="研究ノート" subtitle="じぶんの研究とふたりの研究をまとめて検索できます"/>
 <section className="panel"><input className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="タイトル、名前、聖句、ラベル、メモから検索"/><div className="category-filter-row"><button className={`pill-button ${category==="すべて"?"active":""}`} onClick={()=>setCategory("すべて")}>すべて</button>{categories.map(name=><button key={name} className={`pill-button ${category===name?"active":""}`} onClick={()=>setCategory(name)}>{name}</button>)}</div></section>
 <section className="panel"><div className="panel-title"><h2>{filtered.length}件</h2></div><div className="list">{filtered.map(item=><article className="list-item" key={item.id}><div className="grow"><span className="meta">{item.categoryName}・{item.scope==="couple"?"ふたりの研究":"じぶんの研究"}・{item.status==="draft"?"編集中":"完成"}</span><h3>{item.values.title||item.values.name||item.categoryName}</h3>{item.values.name&&item.values.title&&<p><strong>名前：</strong>{item.values.name}</p>}{item.values.year&&<p><strong>年号：</strong>{item.values.year}</p>}{item.values.scripture&&<p><strong>聖句：</strong>{item.values.scripture}</p>}{item.values.labels&&<p><strong>ラベル：</strong>{item.values.labels}</p>}{item.values.memo&&<p>{item.values.memo}</p>}{Object.entries(item.values.custom??{}).map(([k,v])=>v?<p key={k}><strong>{k}：</strong>{v}</p>:null)}{item.values.links&&<a href={item.values.links.split(/\s+/)[0]} target="_blank" rel="noreferrer">参考リンクを開く</a>}{item.scope==="personal"&&item.ownerUid!==firebaseUser?.uid&&<p className="meta">相手が共有した研究です（閲覧のみ）</p>}</div></article>)}{!personal.loading&&!shared.loading&&!couple.loading&&!filtered.length&&<div className="empty">表示できる研究ノートはありません。</div>}</div></section></>;
}
