import Link from "next/link";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="page-header">
      <Link href="/" className="back-link" aria-label="トップに戻る">‹</Link>
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    </header>
  );
}
