import type { ChapterRef } from "./types";

export type BibleBook = { id: string; name: string; chapters: number };

export const bibleBooks: BibleBook[] = [
  { id: "gen", name: "創世記", chapters: 50 }, { id: "exo", name: "出エジプト記", chapters: 40 },
  { id: "lev", name: "レビ記", chapters: 27 }, { id: "num", name: "民数記", chapters: 36 },
  { id: "deu", name: "申命記", chapters: 34 }, { id: "jos", name: "ヨシュア", chapters: 24 },
  { id: "jdg", name: "裁き人", chapters: 21 }, { id: "rut", name: "ルツ", chapters: 4 },
  { id: "1sa", name: "サムエル第一", chapters: 31 }, { id: "2sa", name: "サムエル第二", chapters: 24 },
  { id: "1ki", name: "列王第一", chapters: 22 }, { id: "2ki", name: "列王第二", chapters: 25 },
  { id: "1ch", name: "歴代第一", chapters: 29 }, { id: "2ch", name: "歴代第二", chapters: 36 },
  { id: "ezr", name: "エズラ", chapters: 10 }, { id: "neh", name: "ネヘミヤ", chapters: 13 },
  { id: "est", name: "エステル", chapters: 10 }, { id: "job", name: "ヨブ", chapters: 42 },
  { id: "psa", name: "詩編", chapters: 150 }, { id: "pro", name: "格言", chapters: 31 },
  { id: "ecc", name: "伝道の書", chapters: 12 }, { id: "sng", name: "ソロモンの歌", chapters: 8 },
  { id: "isa", name: "イザヤ", chapters: 66 }, { id: "jer", name: "エレミヤ", chapters: 52 },
  { id: "lam", name: "哀歌", chapters: 5 }, { id: "eze", name: "エゼキエル", chapters: 48 },
  { id: "dan", name: "ダニエル", chapters: 12 }, { id: "hos", name: "ホセア", chapters: 14 },
  { id: "joe", name: "ヨエル", chapters: 3 }, { id: "amo", name: "アモス", chapters: 9 },
  { id: "oba", name: "オバデヤ", chapters: 1 }, { id: "jon", name: "ヨナ", chapters: 4 },
  { id: "mic", name: "ミカ", chapters: 7 }, { id: "nah", name: "ナホム", chapters: 3 },
  { id: "hab", name: "ハバクク", chapters: 3 }, { id: "zep", name: "ゼパニヤ", chapters: 3 },
  { id: "hag", name: "ハガイ", chapters: 2 }, { id: "zec", name: "ゼカリヤ", chapters: 14 },
  { id: "mal", name: "マラキ", chapters: 4 }, { id: "mat", name: "マタイ", chapters: 28 },
  { id: "mar", name: "マルコ", chapters: 16 }, { id: "luk", name: "ルカ", chapters: 24 },
  { id: "joh", name: "ヨハネ", chapters: 21 }, { id: "act", name: "使徒", chapters: 28 },
  { id: "rom", name: "ローマ", chapters: 16 }, { id: "1co", name: "コリント第一", chapters: 16 },
  { id: "2co", name: "コリント第二", chapters: 13 }, { id: "gal", name: "ガラテア", chapters: 6 },
  { id: "eph", name: "エフェソス", chapters: 6 }, { id: "php", name: "フィリピ", chapters: 4 },
  { id: "col", name: "コロサイ", chapters: 4 }, { id: "1th", name: "テサロニケ第一", chapters: 5 },
  { id: "2th", name: "テサロニケ第二", chapters: 3 }, { id: "1ti", name: "テモテ第一", chapters: 6 },
  { id: "2ti", name: "テモテ第二", chapters: 4 }, { id: "tit", name: "テトス", chapters: 3 },
  { id: "phm", name: "フィレモン", chapters: 1 }, { id: "heb", name: "ヘブライ", chapters: 13 },
  { id: "jas", name: "ヤコブ", chapters: 5 }, { id: "1pe", name: "ペテロ第一", chapters: 5 },
  { id: "2pe", name: "ペテロ第二", chapters: 3 }, { id: "1jo", name: "ヨハネ第一", chapters: 5 },
  { id: "2jo", name: "ヨハネ第二", chapters: 1 }, { id: "3jo", name: "ヨハネ第三", chapters: 1 },
  { id: "jud", name: "ユダ", chapters: 1 }, { id: "rev", name: "啓示", chapters: 22 }
];

export function getBook(bookId: string): BibleBook {
  return bibleBooks.find((book) => book.id === bookId) ?? bibleBooks[0];
}

export function formatChapter(ref: ChapterRef): string {
  return `${getBook(ref.bookId).name} ${ref.chapter}章`;
}

export function advanceChapter(ref: ChapterRef): ChapterRef {
  const bookIndex = bibleBooks.findIndex((book) => book.id === ref.bookId);
  const safeIndex = bookIndex >= 0 ? bookIndex : 0;
  const book = bibleBooks[safeIndex];
  if (ref.chapter < book.chapters) return { bookId: book.id, chapter: ref.chapter + 1 };
  const nextBook = bibleBooks[(safeIndex + 1) % bibleBooks.length];
  return { bookId: nextBook.id, chapter: 1 };
}
