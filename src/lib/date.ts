export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getMonday(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const distance = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + distance);
  return copy;
}

export function getWeekStartISO(date = new Date()): string {
  return toLocalISODate(getMonday(date));
}

export function formatJapaneseDate(dateText: string): string {
  if (!dateText) return "未設定";
  const date = new Date(`${dateText}T00:00:00`);
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(date);
}
