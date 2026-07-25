"use client";
import { useMemo,useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import type { MinistryItem } from "@/lib/types";
const CATEGORIES=["紹介の言葉","ピッタリの聖句","反対意見","電話証言サンプル","手紙証言サンプル"];
export default function MinistryPage(){
 const {firebaseUser}=useAppContext(); const {items,addItem,removeItem}=useHouseholdCollection<MinistryItem>("ministryItems");
 const [query,setQuery]=useState(""); const [show,setShow]=useState(false); const [category,setCategory]=useState(CATEGORIES[0]); const [title,setTitle]=useState(""); const [scripture,setScripture]=useState(""); const [link,setLink]=useState(""); const [note,setNote]=useState("");
 const filtered=useMemo(()=>items.filter(i=>!query.trim()||[i.title,i.category,i.scripture,i.note].join(" ").toLowerCase().includes(query.trim().toLowerCase())),[items,query]);
 const save=async()=>{if(!firebaseUser||!title.trim())return; await addItem({id:crypto.randomUUID(),title:title.trim(),category,scripture:scripture.trim(),link:link.trim(),note:note.trim(),createdAt:new Date().toISOString(),createdBy:firebaseUser.uid}); setTitle("");setScripture("");setLink("");setNote("");setShow(false)};
 return <><PageHeader title="伝道情報" subtitle="証言に使える情報をカテゴリーごとに整理します"/><section className="panel workspace-actions"><button className="button" onClick={()=>setShow(v=>!v)}>＋ 新規作成</button><input className="input grow" value={query} onChange={e=>setQuery(e.target.value)} placeholder="タイトル、聖句、内容から検索"/></section><section className="panel today-topics-placeholder"><div className="panel-title"><h2>今日の話題</h2><span className="meta">準備中</span></div><p>国の話題3件と、市町村の話題2件を、政治・経済・科学・気候・国際情勢などから表示する予定です。</p></section>
 {show&&<section className="panel"><div className="form-grid"><label>カテゴリー<select className="select" value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(n=><option key={n}>{n}</option>)}</select></label><label>タイトル<input className="input" value={title} onChange={e=>setTitle(e.target.value)}/></label><label>関連聖句<input className="input" value={scripture} onChange={e=>setScripture(e.target.value)}/></label><label>参考リンク<input className="input" value={link} onChange={e=>setLink(e.target.value)}/></label><label>内容<textarea className="textarea" value={note} onChange={e=>setNote(e.target.value)}/></label><button className="button" onClick={save}>保存</button></div></section>}
 {CATEGORIES.map(name=>{const xs=filtered.filter(i=>i.category===name);return <section className="panel" key={name}><div className="panel-title"><h2>{name}</h2><span className="meta">{xs.length}件</span></div><div className="list">{xs.map(i=><article className="list-item" key={i.id}><div className="grow"><h3>{i.title}</h3>{i.scripture&&<p className="meta">{i.scripture}</p>}{i.note&&<p>{i.note}</p>}{i.link&&<a href={i.link} target="_blank" rel="noreferrer">リンクを開く</a>}</div><button className="button danger" onClick={()=>removeItem(i.id)}>削除</button></article>)}{!xs.length&&<div className="empty">まだ情報はありません。</div>}</div></section>})}</>;
}
