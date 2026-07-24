import Image from "next/image";
import type { CompanionStats } from "@/lib/types";

type Props = {
  name: string;
  stats: CompanionStats;
  partnerReading?: boolean;
  selfReading?: boolean;
};

const moodImage: Record<CompanionStats["mood"], string> = {
  excited: "/mascot/excited.png",
  happy: "/mascot/jump.png",
  content: "/mascot/idle.png",
  sleepy: "/mascot/sleepy.png",
  waiting: "/mascot/waiting.png",
};

export function AnimatedHeroMascot({
  name,
  stats,
  partnerReading = false,
  selfReading = false,
}: Props) {
  const activity = selfReading ? "reading" : partnerReading ? "cheering" : stats.mood;
  const src = selfReading
    ? "/mascot/reading.png"
    : partnerReading
      ? "/mascot/cheering.png"
      : moodImage[stats.mood];

  return (
    <div
      className={`animated-mascot mascot-${activity}`}
      aria-label={`${name}、${selfReading ? "読書中" : partnerReading ? "読書を応援中" : stats.moodLabel}`}
    >
      <div className="mascot-ground-shadow" aria-hidden="true" />
      <div className="mascot-picture mascot-character-picture">
        <Image
          src={src}
          alt="緑のバンダナを着けた明るい茶色のロングヘア・ダックスフント"
          width={420}
          height={340}
          className="character-mascot"
          priority
        />
        {selfReading && (
          <Image
            src="/mascot/page-turn.png"
            alt=""
            width={420}
            height={340}
            className="character-mascot page-turn-frame"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mascot-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i></div>
      {stats.mood === "sleepy" && !selfReading && <span className="mascot-zzz" aria-hidden="true">Zzz</span>}
      {(stats.mood === "excited" || partnerReading) && !selfReading && <span className="mascot-heart" aria-hidden="true">♥</span>}
    </div>
  );
}
