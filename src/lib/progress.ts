import { bibleBooks, getBook } from "./bible";
import type { ChapterRef, MemberId, ReadingState } from "./types";

export const TOTAL_BIBLE_CHAPTERS = bibleBooks.reduce((sum, book) => sum + book.chapters, 0);

export function canonicalChapterKey(ref: ChapterRef): string {
  return `${ref.bookId}:${ref.chapter}`;
}

export function getCompletedChapterKeys(state: ReadingState, memberId: MemberId): Set<string> {
  const member = state.members[memberId];
  const keys = member.completedChapterKeys ?? [];
  return new Set([
    ...keys,
    ...member.history.map((record) => canonicalChapterKey(record.ref)),
  ]);
}

export function isChapterCompleted(state: ReadingState, memberId: MemberId, ref: ChapterRef): boolean {
  return getCompletedChapterKeys(state, memberId).has(canonicalChapterKey(ref));
}

export function toggleChapterCompleted(state: ReadingState, memberId: MemberId, ref: ChapterRef): ReadingState {
  const member = state.members[memberId];
  const key = canonicalChapterKey(ref);
  const keys = getCompletedChapterKeys(state, memberId);
  if (keys.has(key)) keys.delete(key);
  else keys.add(key);
  return {
    ...state,
    members: {
      ...state.members,
      [memberId]: { ...member, completedChapterKeys: Array.from(keys) },
    },
  };
}

export function getMemberProgress(state: ReadingState, memberId: MemberId) {
  const keys = getCompletedChapterKeys(state, memberId);
  return {
    completed: keys.size,
    total: TOTAL_BIBLE_CHAPTERS,
    percent: Math.round((keys.size / TOTAL_BIBLE_CHAPTERS) * 1000) / 10,
  };
}

export function getBookProgress(state: ReadingState, memberId: MemberId, bookId: string) {
  const book = getBook(bookId);
  const keys = getCompletedChapterKeys(state, memberId);
  let completed = 0;
  for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
    if (keys.has(`${bookId}:${chapter}`)) completed += 1;
  }
  return {
    completed,
    total: book.chapters,
    percent: Math.round((completed / book.chapters) * 100),
  };
}

export function getSharedProgress(state: ReadingState) {
  const husband = getCompletedChapterKeys(state, "husband");
  const wife = getCompletedChapterKeys(state, "wife");
  let both = 0;
  let either = 0;
  for (const book of bibleBooks) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      const key = `${book.id}:${chapter}`;
      if (husband.has(key) || wife.has(key)) either += 1;
      if (husband.has(key) && wife.has(key)) both += 1;
    }
  }
  return { both, either, total: TOTAL_BIBLE_CHAPTERS };
}
