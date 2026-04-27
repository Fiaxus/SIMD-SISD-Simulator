import { Panel } from "./Panel";
import type { SimState } from "@/lib/simEngine";

export function TraceTable({
  state,
  labels,
}: {
  state: SimState;
  labels: { trace: string; cycleCol: string; sisdCol: string; simdCol: string };
}) {
  return (
    <Panel title={labels.trace} accent="amber">
      <div className="scrollbar-deep max-h-[280px] overflow-auto rounded border border-border/40">
        <table className="w-full font-mono text-[11px]">
          <thead className="sticky top-0 bg-background/90 backdrop-blur">
            <tr className="border-b border-border/60 text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium uppercase tracking-wider">{labels.cycleCol}</th>
              <th className="px-3 py-2 font-medium uppercase tracking-wider text-neon-cyan">{labels.sisdCol}</th>
              <th className="px-3 py-2 font-medium uppercase tracking-wider text-neon-magenta">{labels.simdCol}</th>
            </tr>
          </thead>
          <tbody>
            {state.trace.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground/60">
                  // waiting for clock signal...
                </td>
              </tr>
            )}
            {state.trace.map((t) => (
              <tr key={t.cycle} className="border-b border-border/20 hover:bg-background/40">
                <td className="px-3 py-1.5 text-muted-foreground">{String(t.cycle).padStart(3, "0")}</td>
                <td className="px-3 py-1.5 text-neon-cyan/80">{t.sisd}</td>
                <td className="px-3 py-1.5 text-neon-magenta/80">{t.simd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
