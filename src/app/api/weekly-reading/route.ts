import { NextResponse } from "next/server";

export const revalidate = 21600;

type WeeklyReadingResponse = {
  weekStart: string;
  bookId: string;
  bookName: string;
  startChapter: number;
  endChapter: number;
  sourceUrl: string;
  rangeLabel: string;
};

const BOOK_ALIASES: Array<{ id: string; names: string[] }> = [
  { id: "gen", names: ["創世記", "創"] },
  { id: "exo", names: ["出エジプト記", "出"] },
  { id: "lev", names: ["レビ記", "レビ"] },
  { id: "num", names: ["民数記", "民"] },
  { id: "deu", names: ["申命記", "申"] },
  { id: "jos", names: ["ヨシュア"] },
  { id: "jdg", names: ["裁き人"] },
  { id: "rut", names: ["ルツ"] },
  { id: "1sa", names: ["サムエル第一", "サム一"] },
  { id: "2sa", names: ["サムエル第二", "サム二"] },
  { id: "1ki", names: ["列王第一", "王一"] },
  { id: "2ki", names: ["列王第二", "王二"] },
  { id: "1ch", names: ["歴代第一", "代一"] },
  { id: "2ch", names: ["歴代第二", "代二"] },
  { id: "ezr", names: ["エズラ"] },
  { id: "neh", names: ["ネヘミヤ"] },
  { id: "est", names: ["エステル"] },
  { id: "job", names: ["ヨブ"] },
  { id: "psa", names: ["詩編", "詩"] },
  { id: "pro", names: ["格言", "格"] },
  { id: "ecc", names: ["伝道の書", "伝"] },
  { id: "sng", names: ["ソロモンの歌", "歌"] },
  { id: "isa", names: ["イザヤ"] },
  { id: "jer", names: ["エレミヤ"] },
  { id: "lam", names: ["哀歌"] },
  { id: "eze", names: ["エゼキエル"] },
  { id: "dan", names: ["ダニエル"] },
  { id: "hos", names: ["ホセア"] },
  { id: "joe", names: ["ヨエル"] },
  { id: "amo", names: ["アモス"] },
  { id: "oba", names: ["オバデヤ"] },
  { id: "jon", names: ["ヨナ"] },
  { id: "mic", names: ["ミカ"] },
  { id: "nah", names: ["ナホム"] },
  { id: "hab", names: ["ハバクク"] },
  { id: "zep", names: ["ゼパニヤ"] },
  { id: "hag", names: ["ハガイ"] },
  { id: "zec", names: ["ゼカリヤ"] },
  { id: "mal", names: ["マラキ"] },
  { id: "mat", names: ["マタイ"] },
  { id: "mar", names: ["マルコ"] },
  { id: "luk", names: ["ルカ"] },
  { id: "joh", names: ["ヨハネ"] },
  { id: "act", names: ["使徒"] },
  { id: "rom", names: ["ローマ"] },
  { id: "1co", names: ["コリント第一", "コリ一"] },
  { id: "2co", names: ["コリント第二", "コリ二"] },
  { id: "gal", names: ["ガラテア"] },
  { id: "eph", names: ["エフェソス"] },
  { id: "php", names: ["フィリピ"] },
  { id: "col", names: ["コロサイ"] },
  { id: "1th", names: ["テサロニケ第一", "テサ一"] },
  { id: "2th", names: ["テサロニケ第二", "テサ二"] },
  { id: "1ti", names: ["テモテ第一", "テモ一"] },
  { id: "2ti", names: ["テモテ第二", "テモ二"] },
  { id: "tit", names: ["テトス"] },
  { id: "phm", names: ["フィレモン"] },
  { id: "heb", names: ["ヘブライ"] },
  { id: "jas", names: ["ヤコブ"] },
  { id: "1pe", names: ["ペテロ第一", "ペテ一"] },
  { id: "2pe", names: ["ペテロ第二", "ペテ二"] },
  { id: "1jo", names: ["ヨハネ第一", "ヨハ一"] },
  { id: "2jo", names: ["ヨハネ第二", "ヨハ二"] },
  { id: "3jo", names: ["ヨハネ第三", "ヨハ三"] },
  { id: "jud", names: ["ユダ"] },
  { id: "rev", names: ["啓示"] },
];

function getTokyoDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function getWeekStartISO(date = new Date()): string {
  const { year, month, day } = getTokyoDateParts(date);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + offset);
  return utc.toISOString().slice(0, 10);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveBook(label: string) {
  const normalized = label.replace(/\s+/g, "");
  return BOOK_ALIASES.find((book) =>
    book.names.some((name) => normalized === name.replace(/\s+/g, "")),
  );
}

function parseRange(html: string) {
  const text = decodeHtml(html);

  for (const book of BOOK_ALIASES) {
    for (const name of [...book.names].sort((a, b) => b.length - a.length)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`${escaped}\\s*(\\d+)\\s*[-–—〜~]\\s*(\\d+)\\s*章`);
      const match = text.match(pattern);
      if (match) {
        return {
          bookId: book.id,
          bookName: name,
          startChapter: Number(match[1]),
          endChapter: Number(match[2]),
          rangeLabel: `${name} ${match[1]}-${match[2]}章`,
        };
      }

      const singlePattern = new RegExp(`${escaped}\\s*(\\d+)\\s*章`);
      const single = text.match(singlePattern);
      if (single) {
        return {
          bookId: book.id,
          bookName: name,
          startChapter: Number(single[1]),
          endChapter: Number(single[1]),
          rangeLabel: `${name} ${single[1]}章`,
        };
      }
    }
  }

  return null;
}

function findMeetingSourceUrl(html: string, baseUrl: string): string {
  const links = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((match) => match[1]);
  const candidate = links.find((href) => /\/ja\/wol\/d\/r7\/lp-j\/\d+/.test(href));
  if (!candidate) return baseUrl;
  return new URL(candidate, baseUrl).toString();
}

export async function GET() {
  const { year, month, day } = getTokyoDateParts();
  const dailyUrl = `https://wol.jw.org/ja/wol/dt/r7/lp-j/${year}/${month}/${day}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(dailyUrl, {
      signal: controller.signal,
      next: { revalidate: 21600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DailyBibleTask/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: `WOL ${response.status}` }, { status: 502 });
    }

    const html = await response.text();
    const range = parseRange(html);

    if (!range) {
      return NextResponse.json(
        { error: "今週の聖書範囲をページから見つけられませんでした", sourceUrl: dailyUrl },
        { status: 422 },
      );
    }

    const result: WeeklyReadingResponse = {
      weekStart: getWeekStartISO(),
      ...range,
      sourceUrl: findMeetingSourceUrl(html, dailyUrl),
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "WOLから取得できませんでした",
        sourceUrl: dailyUrl,
      },
      { status: 502 },
    );
  }
}
