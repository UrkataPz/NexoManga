export type AdSize =
  | "large-rectangle"
  | "medium-rectangle"
  | "leaderboard"
  | "wide-skyscraper"
  | "banner"
  | "mobile-banner";

const AD_SIZES = {
  "large-rectangle": { width: 336, height: 280 },
  "medium-rectangle": { width: 300, height: 250 },
  leaderboard: { width: 728, height: 90 },
  "wide-skyscraper": { width: 160, height: 600 },
  banner: { width: 468, height: 60 },
  "mobile-banner": { width: 320, height: 100 },
};

interface AdSlotProps {
  size: AdSize;
}

export function AdSlot({ size }: AdSlotProps) {
  const { width, height } = AD_SIZES[size];

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted text-center text-xs font-medium text-muted-foreground"
      style={{ width, height, maxWidth: "100%" }}
    >
      Publicidad
      <br />
      {width}×{height}px
    </div>
  );
}