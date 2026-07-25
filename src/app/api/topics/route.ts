import { NextResponse } from "next/server";

export const revalidate = 43200;

type GdeltArticle = { title?: string; url?: string; domain?: string; seendate?: string };
type Topic = { id: string; scope: "national" | "local"; title: string; summary: string; source: string; url: string; publishedAt: string };

const NATIONAL = [
  { id: "climate", label: "気候・災害", query: '(Japan AND (heatwave OR extreme weather OR typhoon OR earthquake OR disaster OR climate))' },
  { id: "economy", label: "経済・暮らし", query: '(Japan AND (economy OR inflation OR prices OR wages OR cost of living OR yen))' },
  { id: "public", label: "政治・科学・国際情勢", query: '(Japan AND (government OR election OR science OR technology OR health OR war OR terrorism OR security))' },
];
const LOCAL = [
  { id: "fukuoka-life", label: "福岡市の暮らし", query: '(Fukuoka AND (city OR transport OR economy OR heat OR disaster OR redevelopment))' },
  { id: "fukuoka-public", label: "福岡市の地域課題", query: '(Fukuoka AND (government OR science OR health OR climate OR safety OR population))' },
];

function useful(a: GdeltArticle) {
  const t = (a.title ?? "").replace(/\s+/g," ").trim();
  return t.length >= 8 && !/(celebrity|idol|anime|game|sports|baseball|soccer|movie|music|fashion|recipe)/i.test(t);
}

async function fetchOne(item: {id:string;label:string;query:string}, scope: "national"|"local"): Promise<Topic|null> {
  const params = new URLSearchParams({ query:item.query, mode:"artlist", maxrecords:"25", timespan:"30d", format:"json", sort:"hybridrel" });
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`, { next:{ revalidate:43200 }, headers:{"User-Agent":"dailybibletask/1.0"} });
  if (!response.ok) return null;
  const data = await response.json() as { articles?: GdeltArticle[] };
  const article = data.articles?.find(useful);
  if (!article?.title || !article.url) return null;
  return { id:`${scope}-${item.id}`, scope, title:article.title.replace(/\s+/g," ").trim(), summary:item.label, source:article.domain ?? new URL(article.url).hostname, url:article.url, publishedAt:article.seendate ?? "" };
}

export async function GET() {
  try {
    const results = await Promise.all([...NATIONAL.map((i)=>fetchOne(i,"national")), ...LOCAL.map((i)=>fetchOne(i,"local"))]);
    return NextResponse.json({ updatedAt:new Date().toISOString(), location:{country:"日本", municipality:"福岡市"}, topics:results.filter(Boolean) });
  } catch (error) {
    return NextResponse.json({ updatedAt:new Date().toISOString(), location:{country:"日本", municipality:"福岡市"}, topics:[], error:error instanceof Error?error.message:"取得失敗" });
  }
}
