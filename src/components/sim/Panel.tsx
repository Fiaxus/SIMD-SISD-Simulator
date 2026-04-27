import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  title?: string;
  badge?: string;
  accent?: "cyan" | "magenta" | "green" | "amber";
  children: ReactNode;
  className?: string;
}

const accentMap = {
  cyan: { text: "text-neon-cyan text-glow-cyan", border: "border-neon-cyan/40", dot: "bg-neon-cyan" },
  magenta: { text: "text-neon-magenta text-glow-magenta", border: "border-neon-magenta/40", dot: "bg-neon-magenta" },
  green: { text: "text-neon-green text-glow-green", border: "border-neon-green/40", dot: "bg-neon-green" },
  amber: { text: "text-neon-amber", border: "border-neon-amber/40", dot: "bg-neon-amber" },
};

export function Panel({ title, badge, accent = "cyan", children, className }: PanelProps) {
  const a = accentMap[accent];
  return (
    <div className={cn("panel relative overflow-hidden scanlines", a.border, className)}>
      {(title || badge) && (
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full animate-pulse-glow", a.dot)} />
            <h3 className={cn("text-xs font-semibold uppercase tracking-[0.2em]", a.text)}>{title}</h3>
          </div>
          {badge && (
            <span className="rounded border border-border bg-background/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
