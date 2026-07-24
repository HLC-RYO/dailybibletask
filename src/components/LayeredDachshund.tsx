import type { CompanionMood } from "@/lib/types";

export type DachshundAction = CompanionMood | "reading" | "cheering";

type Props = {
  action: DachshundAction;
  compact?: boolean;
  label?: string;
};

const poseForAction: Record<DachshundAction, string> = {
  content: "normal",
  waiting: "normal",
  happy: "happy",
  cheering: "happy",
  excited: "excited",
  sleepy: "sleepy",
  reading: "reading",
};

export function LayeredDachshund({ action, compact = false, label = "ダックスフント" }: Props) {
  const pose = poseForAction[action];
  const isJoyful = action === "happy" || action === "cheering" || action === "excited";
  const isSleeping = action === "sleepy";

  return (
    <div
      className={`watercolor-dachshund action-${action} pose-${pose} ${compact ? "is-compact" : ""}`}
      role="img"
      aria-label={label}
    >
      <div className="watercolor-dog-stage">
        <img
          className="watercolor-dog-pose"
          src={`/mascot/${pose}.png`}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <span className="watercolor-dog-blink" aria-hidden="true" />
        {action === "reading" && <span className="page-glow" aria-hidden="true" />}
        {isJoyful && (
          <span className="watercolor-sparkles" aria-hidden="true">
            <i>✦</i><i>✧</i><i>✦</i>
          </span>
        )}
        {isSleeping && <span className="watercolor-zzz" aria-hidden="true">Zzz</span>}
      </div>
    </div>
  );
}
