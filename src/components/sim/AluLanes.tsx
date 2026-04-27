import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface AluLanesProps {
  laneCount: number;
  active: number[]; // indices currently flowing through (0..laneCount-1 mapping)
  accent: "cyan" | "magenta";
  label: string;
}

const accent = {
  cyan: { text: "text-neon-cyan", glow: "border-glow-cyan", border: "border-neon-cyan/50", bg: "bg-neon-cyan" },
  magenta: { text: "text-neon-magenta", glow: "border-glow-magenta", border: "border-neon-magenta/50", bg: "bg-neon-magenta" },
};

export function AluLanes({ laneCount, active, accent: a, label }: AluLanesProps) {
  const c = accent[a];
  // Build lanes — for SISD laneCount=1
  const lanes = Array.from({ length: laneCount });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{laneCount} LANE</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {lanes.map((_, i) => {
          const isActive = active.length > 0;
          return (
            <div
              key={i}
              className={cn(
                "relative flex items-center gap-2 rounded border bg-background/40 px-2 py-1.5 transition-all",
                c.border,
                isActive && c.glow,
              )}
            >
              <Cpu className={cn("h-3.5 w-3.5", c.text)} />
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-background/60">
                {isActive && (
                  <motion.div
                    className={cn("absolute inset-y-0 w-1/3 rounded-full", c.bg)}
                    animate={{ x: ["-100%", "300%"] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
              <span className={cn("font-mono text-[10px]", c.text)}>ALU{i}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
