import { NextResponse } from "next/server";

export const revalidate = 3600;

const HOME_URL = "https://wol.jw.org/ja/wol/h/r7/lp-j";

function tokyoDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function decodeEntities(value: string): string {
  const entities: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", hellip: "…",
  };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name] ?? match);
}

function plainText(html: string): string {
  return decodeEntities(
    html
      .replace(/<sup[\s\S]*?<\/sup>/gi, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractDailyScripture(html: string): string | null {
  const classMatch = html.match(/<p[^>]*class=["'][^"']*(?:themeScrp|dailyText)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  if (classMatch) return plainText(classMatch[1]);

  const headingIndex = html.search(/<h2[^>]*>[\s\S]*?月[\s\S]*?日[\s\S]*?<\/h2>/i);
  if (headingIndex >= 0) {
    const afterHeading = html.slice(headingIndex).replace(/^[\s\S]*?<\/h2>/i, "");
    const firstParagraph = afterHeading.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (firstParagraph) {
      const text = plainText(firstParagraph[1]);
      if (text.length >= 8 && text.length <= 350) return text;
    }
  }
  return null;
}

export async function GET() {
  const { year, month, day } = tokyoDateParts();
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const detailUrl = `https://wol.jw.org/ja/wol/dt/r7/lp-j/${year}/${month}/${day}`;

  try {
    const response = await fetch(detailUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DailyBibleTask/1.0)",
        "Accept-Language": "ja-JP,ja;q=0.9",
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`WOL returned ${response.status}`);
    const scripture = extractDailyScripture(await response.text());
    if (!scripture) throw new Error("Daily scripture was not found");
    return NextResponse.json({ date, scripture, sourceUrl: HOME_URL, detailUrl });
  } catch (error) {
    console.error("Failed to load the daily scripture", error);
    return NextResponse.json(
      { date, scripture: null, sourceUrl: HOME_URL, detailUrl, error: "日々の聖句を取得できませんでした。" },
      { status: 502 },
    );
  }
}
