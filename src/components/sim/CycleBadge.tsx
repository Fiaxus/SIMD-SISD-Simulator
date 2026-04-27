import { cn } from "@/lib/utils";

export function CycleBadge({
  label,
  value,
  accent = "cyan",
}: {
  label: string;
  value: string | number;
  accent?: "cyan" | "magenta" | "green" | "amber";
}) {
  const colors = {
    cyan: "text-neon-cyan text-glow-cyan",
    magenta: "text-neon-magenta text-glow-magenta",
    green: "text-neon-green text-glow-green",
    amber: "text-neon-amber",
  };
  return (
    <div className="rounded border border-border/60 bg-background/40 px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-2xl font-bold tabular-nums", colors[accent])}>{value}</div>
    </div>
  );
}
