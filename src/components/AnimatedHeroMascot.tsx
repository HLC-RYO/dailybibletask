import Image from "next/image";
import type { CompanionStats } from "@/lib/types";

type Props = {
  name: string;
  stats: CompanionStats;
  partnerReading?: boolean;
};

export function AnimatedHeroMascot({ name, stats, partnerReading = false }: Props) {
  const activity = partnerReading ? "cheering" : stats.mood;

  return (
    <div
      className={`animated-mascot mascot-${activity}`}
      aria-label={`${name}、${partnerReading ? "読書を応援中" : stats.moodLabel}`}
    >
      <div className="mascot-ground-shadow" aria-hidden="true" />
      <div className="mascot-picture">
        <Image
          src="/dachshund-hero.png"
          alt="開いた聖書のそばでうれしそうにしているダックスフント"
          width={1024}
          height={540}
          className="hero-mascot"
          priority
        />
        <span className="mascot-blink" aria-hidden="true" />
      </div>
      <div className="mascot-sparkles" aria-hidden="true">
        <i>✦</i><i>✧</i><i>✦</i>
      </div>
      {stats.mood === "sleepy" && <span className="mascot-zzz" aria-hidden="true">Zzz</span>}
      {(stats.mood === "excited" || partnerReading) && <span className="mascot-heart" aria-hidden="true">♥</span>}
    </div>
  );
}
