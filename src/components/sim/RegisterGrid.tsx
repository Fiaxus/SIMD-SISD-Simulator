import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RegisterGridProps {
  label: string;
  values: number[];
  active?: number[];
  done?: boolean[];
  accent?: "cyan" | "magenta" | "green";
}

const accentColor = {
  cyan: "border-neon-cyan/60 text-neon-cyan shadow-[0_0_12px_oklch(0.78_0.15_200/0.45)]",
  magenta: "border-neon-magenta/60 text-neon-magenta shadow-[0_0_12px_oklch(0.78_0.16_65/0.45)]",
  green: "border-neon-green/60 text-neon-green shadow-[0_0_12px_oklch(0.82_0.14_165/0.45)]",
};

export function RegisterGrid({ label, values, active = [], done = [], accent = "cyan" }: RegisterGridProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground">[{values.length}]</span>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {values.map((v, i) => {
          const isActive = active.includes(i);
          const isDone = done[i];
          return (
            <motion.div
              key={i}
              animate={
                isActive
                  ? { scale: [1, 1.15, 1.08] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.3 }}
              className={cn(
                "relative flex h-9 items-center justify-center rounded border bg-background/40 font-mono text-[11px] transition-all",
                isActive && accentColor[accent],
                !isActive && isDone && "border-border/60 text-foreground/50",
                !isActive && !isDone && "border-border/30 text-muted-foreground/70",
              )}
            >
              {v}
              {isActive && (
                <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
