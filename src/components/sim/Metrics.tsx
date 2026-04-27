import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel } from "./Panel";
import { CycleBadge } from "./CycleBadge";
import { OP_META, type SimState } from "@/lib/simEngine";

interface MetricsProps {
  state: SimState;
  labels: {
    metrics: string;
    totalCycles: string;
    throughput: string;
    speedup: string;
    efficiency: string;
    speedupChart: string;
    amdahlTitle: string;
    parallelFraction: string;
    serialFraction: string;
    theoreticalMax: string;
    amdahlFormula: string;
    amdahlNote: string;
  };
}

export function Metrics({ state, labels }: MetricsProps) {
  const sisdT = state.sisdCycle || state.sisdTotalCycles;
  const simdT = state.simdCycle || state.simdTotalCycles;
  const speedup = simdT > 0 ? sisdT / simdT : 0;
  const efficiency = state.laneCount > 0 ? (speedup / state.laneCount) * 100 : 0;
  const sisdThroughput = sisdT > 0 ? state.A.length / sisdT : 0;
  const simdThroughput = simdT > 0 ? state.A.length / simdT : 0;

  // Amdahl Yasası bilgisi
  const meta = OP_META[state.op];
  const P = meta.parallelFraction;
  const N = state.laneCount;
  const amdahlSpeedup = 1 / ((1 - P) + P / N);
  // N → ∞ limit: 1 / (1-P)
  const amdahlMax = P >= 1 ? Infinity : 1 / (1 - P);

  const data = [
    { name: "SISD", cycles: sisdT, fill: "oklch(0.78 0.16 65)" },
    { name: "SIMD", cycles: simdT, fill: "oklch(0.78 0.15 200)" },
  ];

  return (
    <Panel title={labels.metrics} accent="green">
      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid grid-cols-2 gap-2">
          <CycleBadge label={`SISD ${labels.totalCycles}`} value={sisdT} accent="cyan" />
          <CycleBadge label={`SIMD ${labels.totalCycles}`} value={simdT} accent="magenta" />
          <CycleBadge label={`SISD ${labels.throughput}`} value={sisdThroughput.toFixed(2)} accent="cyan" />
          <CycleBadge label={`SIMD ${labels.throughput}`} value={simdThroughput.toFixed(2)} accent="magenta" />
          <CycleBadge label={labels.speedup} value={`${speedup.toFixed(2)}×`} accent="green" />
          <CycleBadge label={labels.efficiency} value={`${efficiency.toFixed(0)}%`} accent="amber" />
        </div>

        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {labels.speedupChart}
          </div>
          <div className="h-[220px] rounded border border-border/40 bg-background/30 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 254 / 0.4)" />
                <XAxis
                  dataKey="name"
                  stroke="oklch(0.65 0.02 254)"
                  style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                />
                <YAxis
                  stroke="oklch(0.65 0.02 254)"
                  style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
                />
                <Tooltip
                  cursor={false}
                  trigger="hover"
                  shared={false}
                  contentStyle={{
                    background: "oklch(0.18 0.02 252 / 0.95)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid oklch(0.28 0.02 254 / 0.6)",
                    borderRadius: 8,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 12,
                    color: "oklch(0.97 0.01 250)",
                    boxShadow: "0 8px 24px -8px oklch(0 0 0 / 0.4)",
                  }}
                  labelStyle={{ color: "oklch(0.97 0.01 250)" }}
                  itemStyle={{ color: "oklch(0.97 0.01 250)" }}
                />
                <Bar dataKey="cycles" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Amdahl Yasası Analizi */}
      <div className="mt-4 rounded border border-border/40 bg-background/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {labels.amdahlTitle}
          </div>
          <code className="font-mono text-[10px] text-primary/80">{labels.amdahlFormula}</code>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CycleBadge label={labels.parallelFraction} value={P.toFixed(2)} accent="cyan" />
          <CycleBadge label={labels.serialFraction} value={(1 - P).toFixed(2)} accent="amber" />
          <CycleBadge
            label={`Amdahl S(${N})`}
            value={`${amdahlSpeedup.toFixed(2)}×`}
            accent="green"
          />
          <CycleBadge
            label={labels.theoreticalMax}
            value={amdahlMax === Infinity ? "∞" : `${amdahlMax.toFixed(1)}×`}
            accent="magenta"
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{labels.amdahlNote}</p>
      </div>
    </Panel>
  );
}
