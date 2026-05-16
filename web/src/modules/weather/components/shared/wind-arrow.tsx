import { ArrowUp } from "lucide-react";

type WindArrowProps = Readonly<{ direction: number }>;

/**
 * Small arrow rotated to point DOWNWIND. Met providers report wind
 * direction as the angle the wind is COMING FROM (0 = north); we add
 * 180° so the arrow points where the wind is GOING — that's where
 * sprayer drift travels, which is the agent's mental model.
 */
export function WindArrow({ direction }: WindArrowProps) {
  const rotation = (direction + 180) % 360;
  return (
    <ArrowUp
      className="size-3 shrink-0"
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-label={`Wind from ${Math.round(direction)}°`}
    />
  );
}
