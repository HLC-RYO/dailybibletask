import { LayeredDachshund } from "@/components/LayeredDachshund";
import type { CompanionStats } from "@/lib/types";

type Props = {
  name: string;
  stats: CompanionStats;
  partnerReading?: boolean;
  selfReading?: boolean;
};

export function AnimatedHeroMascot({ name, stats, partnerReading = false, selfReading = false }: Props) {
  const action = selfReading ? "reading" : partnerReading ? "cheering" : stats.mood;
  return (
    <div className={`animated-mascot mascot-${action}`} aria-label={`${name}、${selfReading ? "読書中" : partnerReading ? "読書を応援中" : stats.moodLabel}`}>
      <LayeredDachshund action={action} label={`緑のバンダナを着けた${name}`} />
    </div>
  );
}
