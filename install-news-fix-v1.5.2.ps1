param([string]$ProjectPath = ".")

$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
$Target = Join-Path $ProjectPath "src\app\api\topics\route.ts"

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
  throw "package.json が見つかりません。DailyBibleTask のプロジェクト直下で実行してください。"
}

$Content = @'
import { NextResponse } from "next/server";

export const revalidate = 21600;

type TopicScope = "national" | "local";

type Topic = {
  id: string;
  scope: TopicScope;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
};

type SearchDefinition = {
  id: string;
  scope: TopicScope;
  label: string;
  query: string;
  fallbackTitle: string;
};

const SEARCHES: SearchDefinition[] = [
  {
    id: "national-climate",
    scope: "national",
    label: "気候・災害",
    query: "日本 猛暑 OR 台風 OR 豪雨 OR 地震 OR 防災",
    fallbackTitle: "猛暑や自然災害への備え",
  },
  {
    id: "national-economy",
    scope: "national",
    label: "経済・暮らし",
    query: "日本 物価 OR 家計 OR 経済 OR 賃金 OR 円相場",
    fallbackTitle: "物価や家計を巡る動き",
  },
  {
    id: "national-public",
    scope: "national",
    label: "政治・科学・国際情勢",
    query: "日本 政治 OR 科学 OR 医療 OR 国際情勢 OR 戦争",
    fallbackTitle: "政治・科学・国際情勢の主な動き",
  },
  {
    id: "local-life",
    scope: "local",
    label: "福岡市の暮らし",
    query: "福岡市 交通 OR 再開発 OR 物価 OR 猛暑 OR 防災",
    fallbackTitle: "福岡市の暮らしやまちづくり",
  },
  {
    id: "local-public",
    scope: "local",
    label: "福岡市の地域課題",
    query: "福岡市 行政 OR 医療 OR 気候 OR 安全 OR 人口",
    fallbackTitle: "福岡市の行政・医療・地域課題",
  },
];

const EXCLUDED_WORDS =
  /芸能|アイドル|アニメ|ゲーム|映画|音楽|スポーツ|野球|サッカー|ゴシップ|ランキング|レシピ/i;

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function googleNewsSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: "ja",
    gl: "JP",
    ceid: "JP:ja",
  });
  return `https://news.google.com/search?${params.toString()}`;
}

async function fetchTopic(definition: SearchDefinition): Promise<Topic> {
  const params = new URLSearchParams({
    q: definition.query,
    hl: "ja",
    gl: "JP",
    ceid: "JP:ja",
  });
  const rssUrl = `https://news.google.com/rss/search?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(rssUrl, {
      signal: controller.signal,
      next: { revalidate: 21600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DailyBibleTask/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`RSS ${response.status}`);

    const xml = await response.text();
    const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
      .map((match) => match[1])
      .map((itemXml) => ({
        title: tagValue(itemXml, "title"),
        link: tagValue(itemXml, "link"),
        pubDate: tagValue(itemXml, "pubDate"),
        source: tagValue(itemXml, "source"),
      }))
      .filter((item) =>
        item.title.length >= 8 &&
        item.link.startsWith("http") &&
        !EXCLUDED_WORDS.test(item.title),
      );

    const article = items[0];
    if (!article) throw new Error("該当記事なし");

    return {
      id: definition.id,
      scope: definition.scope,
      title: article.title,
      summary: definition.label,
      source: article.source || "Googleニュース",
      url: article.link,
      publishedAt: article.pubDate,
    };
  } catch {
    return {
      id: definition.id,
      scope: definition.scope,
      title: definition.fallbackTitle,
      summary: `${definition.label}・関連ニュースを見る`,
      source: "Googleニュース検索",
      url: googleNewsSearchUrl(definition.query),
      publishedAt: "",
    };
  }
}

export async function GET() {
  const topics = await Promise.all(SEARCHES.map(fetchTopic));

  return NextResponse.json({
    updatedAt: new Date().toISOString(),
    location: {
      country: "日本",
      municipality: "福岡市",
    },
    topics,
  });
}
'@

New-Item -ItemType Directory -Force -Path (Split-Path $Target -Parent) | Out-Null
Set-Content -Path $Target -Value $Content -Encoding UTF8

Write-Host "更新: src\app\api\topics\route.ts" -ForegroundColor Green
Write-Host ""
Write-Host "ニュース取得修正 v1.5.2 完了" -ForegroundColor Cyan
Write-Host "次を実行してください:"
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Fix daily topics news feed"'
Write-Host "git push"
