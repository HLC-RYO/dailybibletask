import Link from "next/link";

export function FeatureCard({ href, icon, title, description, meta }: { href: string; icon: string; title: string; description: string; meta?: string }) {
  return (
    <Link className="feature-card" href={href}>
      <span className="feature-icon" aria-hidden>{icon}</span>
      <span className="feature-copy">
        <strong>{title}</strong>
        <span>{description}</span>
        {meta && <small>{meta}</small>}
      </span>
      <span className="arrow" aria-hidden>›</span>
    </Link>
  );
}
