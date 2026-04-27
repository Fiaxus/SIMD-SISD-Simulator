import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Shuffle,
  Download,
  Cpu,
  Languages,
  Zap,
  ChevronDown,
  ArrowDown,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

import { dict, type Lang } from "@/lib/i18n";
import {
  createInitialState,
  exportCsv,
  OP_META,
  tick,
  type OpId,
  type Packet,
  type SimState,
} from "@/lib/simEngine";
import { Panel } from "@/components/sim/Panel";
import { ProcessorCard } from "@/components/sim/ProcessorCard";
import { Metrics } from "@/components/sim/Metrics";
import { TraceTable } from "@/components/sim/TraceTable";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VECTOR.SIM — SIMD vs SISD Architecture Simulator" },
      {
        name: "description",
        content:
          "Interactive cycle-by-cycle visualization of SISD vs SIMD vector processor architectures. BM208 final project, Düzce University.",
      },
      { property: "og:title", content: "VECTOR.SIM — SIMD vs SISD Simulator" },
      {
        property: "og:description",
        content:
          "Watch a classic single-core CPU race against a wide-datapath SIMD vector engine on the same task, in real time.",
      },
    ],
  }),
  component: Index,
});

const PACKET_OPS: Record<Packet, OpId[]> = {
  vector: ["add", "dot", "matmul"],
  image: ["brightness", "grayscale", "convolution"],
  science: ["saxpy", "euclid", "fft"],
};

const SPEED_OPTIONS = [
  { label: "0.5×", ms: 1200 },
  { label: "1×", ms: 600 },
  { label: "2×", ms: 300 },
  { label: "4×", ms: 120 },
];

function Index() {
  const [lang, setLang] = useState<Lang>("tr");
  const t = dict[lang];

  const [packet, setPacket] = useState<Packet>("vector");
  const [op, setOp] = useState<OpId>("add");
  const [laneCount, setLaneCount] = useState(4);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [running, setRunning] = useState(false);
  const [seed, setSeed] = useState(1);
  const [state, setState] = useState<SimState>(() => createInitialState("add", 4, 1));

  // Reset when op or lane changes
  useEffect(() => {
    setState(createInitialState(op, laneCount, seed));
    setRunning(false);
  }, [op, laneCount, seed]);

  // Auto-tick
  useEffect(() => {
    if (!running || state.finished) return;
    const id = setTimeout(() => {
      setState((s) => {
        const next = tick(s);
        if (next.finished) setRunning(false);
        return next;
      });
    }, SPEED_OPTIONS[speedIdx].ms);
    return () => clearTimeout(id);
  }, [running, state, speedIdx]);

  const handleStep = () => setState((s) => tick(s));
  const handleReset = () => {
    setState(createInitialState(op, laneCount, seed));
    setRunning(false);
  };
  const handleRandomize = () => setSeed((s) => s + 1);
  const handleExport = () => {
    const csv = exportCsv(state);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simd-trace-${op}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const opMeta = OP_META[op];
  const opInfo = t.ops[op];
  const statusMap = {
    idle: t.idle,
    fetch: t.fetching,
    decode: t.decoding,
    exec: t.executing,
    write: t.writing,
    done: t.done,
  };

  return (
    <div className="relative min-h-screen">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Cpu className="h-7 w-7 text-neon-cyan animate-flicker" />
              <span className="absolute inset-0 -z-10 blur-md text-neon-cyan">
                <Cpu className="h-7 w-7" />
              </span>
            </div>
            <div>
              <div className="font-mono text-sm font-bold tracking-[0.2em] text-neon-cyan text-glow-cyan">
                {t.brand}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                BM208
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "tr" ? "en" : "tr")}
              className="flex items-center gap-1.5 rounded border border-border/60 bg-background/50 px-3 py-1.5 font-mono text-xs uppercase text-muted-foreground transition hover:border-neon-cyan/60 hover:text-neon-cyan"
            >
              <Languages className="h-3.5 w-3.5" />
              {lang.toUpperCase()}
            </button>
            <a
              href="#simulator"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("simulator");
                if (el) {
                  const y = el.getBoundingClientRect().top + window.scrollY - 8;
                  window.scrollTo({ top: y, behavior: "smooth" });
                }
              }}
              className="hidden md:flex items-center gap-1.5 rounded border border-neon-magenta/50 bg-neon-magenta/10 px-3 py-1.5 font-mono text-xs uppercase text-neon-magenta transition hover:bg-neon-magenta/20"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              {t.startSim}
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto max-w-[1400px] px-6 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-cyan">
            // {t.project}
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tighter leading-[0.95] md:text-6xl">
            <span className="text-gradient">{lang === "tr" ? "Klasik CPU." : "Classic CPU."}</span>
            <br />
            <span className="text-glow-magenta text-neon-magenta">{lang === "tr" ? "SIMD vektör." : "SIMD vector."}</span>
            <br />
            <span className="text-glow-cyan text-neon-cyan caret">{lang === "tr" ? "Aynı görev." : "Same task."}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t.subtitle}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-wider">
            <div className="rounded border border-neon-cyan/40 bg-neon-cyan/5 px-3 py-1.5 text-neon-cyan">
              {t.team}: Oğuzhan Püsküllü · Adem Güli · Nafi Berkay Şahin · Mustafa Abdurrahman Güneş
            </div>
            <div className="rounded border border-neon-magenta/40 bg-neon-magenta/5 px-3 py-1.5 text-neon-magenta">
              {t.advisor}: {t.advisorName}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 font-mono text-xs text-muted-foreground">
            <ChevronDown className="h-4 w-4 animate-bounce text-neon-cyan" />
            <span>{lang === "tr" ? "​" : "Live simulation below"}</span>
          </div>
        </motion.div>
      </section>

      {/* CONTROL PANEL */}
      <section id="simulator" className="mx-auto max-w-[1400px] px-6 py-4">
        <Panel title={t.controlPanel} accent="cyan">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            {/* Op selection */}
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {t.operation}
              </label>
              <div className="space-y-2">
                <div className="flex gap-1">
                  {(Object.keys(PACKET_OPS) as Packet[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPacket(p);
                        setOp(PACKET_OPS[p][0]);
                      }}
                      className={cn(
                        "flex-1 rounded border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition",
                        packet === p
                          ? "border-neon-cyan bg-neon-cyan/15 text-neon-cyan"
                          : "border-border/60 text-muted-foreground hover:border-neon-cyan/40",
                      )}
                    >
                      {t.packets[p]}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {PACKET_OPS[packet].map((o) => {
                    const meta = OP_META[o];
                    const levelColor = {
                      easy: "border-neon-green/50 text-neon-green",
                      medium: "border-neon-amber/50 text-neon-amber",
                      hard: "border-destructive/50 text-destructive",
                    }[meta.difficulty];
                    return (
                      <button
                        key={o}
                        onClick={() => setOp(o)}
                        className={cn(
                          "rounded border px-2 py-2 text-left font-mono transition",
                          op === o
                            ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                            : "border-border/60 text-muted-foreground hover:border-neon-cyan/40",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase">{t.ops[o].name}</span>
                          <span className={cn("rounded border px-1 text-[8px]", levelColor)}>
                            {t[meta.difficulty as "easy" | "medium" | "hard"]}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-[10px] text-muted-foreground/70">
                          {t.ops[o].desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Lane width */}
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {t.vectorWidth}
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[2, 4, 8, 16].map((n) => (
                  <button
                    key={n}
                    onClick={() => setLaneCount(n)}
                    className={cn(
                      "rounded border py-2 font-mono text-xs font-bold transition",
                      laneCount === n
                        ? "border-neon-magenta bg-neon-magenta/15 text-neon-magenta text-glow-magenta"
                        : "border-border/60 text-muted-foreground hover:border-neon-magenta/40",
                    )}
                  >
                    ×{n}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {t.speed}
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {SPEED_OPTIONS.map((s, i) => (
                    <button
                      key={s.label}
                      onClick={() => setSpeedIdx(i)}
                      className={cn(
                        "rounded border py-1.5 font-mono text-[11px] transition",
                        speedIdx === i
                          ? "border-neon-amber bg-neon-amber/10 text-neon-amber"
                          : "border-border/60 text-muted-foreground hover:border-neon-amber/40",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 self-start">
              <button
                onClick={() => setRunning((r) => !r)}
                disabled={state.finished}
                className={cn(
                  "col-span-2 flex items-center justify-center gap-2 rounded border-2 py-3 font-mono text-sm font-bold uppercase tracking-wider transition",
                  running
                    ? "border-neon-amber bg-neon-amber/10 text-neon-amber"
                    : "border-neon-green bg-neon-green/10 text-neon-green text-glow-green border-glow-green",
                  state.finished && "opacity-40",
                )}
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? t.pause : t.play}
              </button>
              <button
                onClick={handleStep}
                disabled={state.finished}
                className="flex items-center justify-center gap-1.5 rounded border border-neon-cyan/50 bg-neon-cyan/5 py-2 font-mono text-xs uppercase text-neon-cyan transition hover:bg-neon-cyan/15 disabled:opacity-40"
              >
                <StepForward className="h-3.5 w-3.5" />
                {t.step}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-1.5 rounded border border-border/70 bg-background/40 py-2 font-mono text-xs uppercase text-muted-foreground transition hover:border-destructive/60 hover:text-destructive"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.reset}
              </button>
              <button
                onClick={handleRandomize}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded border border-border/70 bg-background/40 py-2 font-mono text-xs uppercase text-muted-foreground transition hover:border-neon-magenta/60 hover:text-neon-magenta"
              >
                <Shuffle className="h-3.5 w-3.5" />
                {t.randomize}
              </button>
            </div>

            {/* Export */}
            <div className="self-start">
              <button
                onClick={handleExport}
                disabled={state.trace.length === 0}
                className="flex h-full w-full flex-col items-center justify-center gap-2 rounded border border-neon-amber/40 bg-neon-amber/5 px-4 py-3 font-mono text-xs uppercase text-neon-amber transition hover:bg-neon-amber/15 disabled:opacity-40"
              >
                <Download className="h-5 w-5" />
                {t.exportCsv}
              </button>
            </div>
          </div>
        </Panel>
      </section>

      {/* SIDE-BY-SIDE PROCESSORS */}
      <section className="mx-auto max-w-[1400px] px-6 py-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <ProcessorCard
            variant="sisd"
            title={t.classic}
            subtitle={t.classicSub}
            A={state.A}
            B={state.B}
            out={state.sisdOut}
            active={state.sisdActive}
            cycle={state.sisdCycle}
            totalCycles={state.sisdTotalCycles}
            phase={state.sisdPhase}
            laneCount={1}
            instructionText={`${opInfo.name.split(" ")[0].toUpperCase()}.S`}
            labels={{
              registers: t.registers,
              aluUnit: t.aluUnit,
              output: t.output,
              cycle: t.cycle,
              instruction: t.instruction,
              status: t.status,
              statusMap,
              pipeFetch: t.pipeFetch,
              pipeDecode: t.pipeDecode,
              pipeExecute: t.pipeExecute,
              pipeWriteback: t.pipeWriteback,
              computing: t.computing,
              waiting: t.waiting,
              loading: t.loading,
              aluDone: t.aluDone,
              elementProgress: t.elementProgress,
              batchProgress: t.batchProgress,
              empty: t.msgEmpty,
              msgFetch: t.msgFetchSisd,
              msgDecode: t.msgDecodeSisd,
              msgExec: t.msgExecSisd,
              msgWrite: t.msgWriteSisd,
            }}
          />
          <ProcessorCard
            variant="simd"
            title={t.simd}
            subtitle={t.simdSub}
            A={state.A}
            B={state.B}
            out={state.simdOut}
            active={state.simdActive}
            cycle={state.simdCycle}
            totalCycles={state.simdTotalCycles}
            phase={state.simdPhase}
            laneCount={laneCount}
            instructionText={`V${opInfo.name.split(" ")[0].toUpperCase()}.${laneCount}`}
            labels={{
              registers: t.registers,
              aluUnit: t.aluUnit,
              aluUnitSimd: t.aluUnitSimd,
              output: t.output,
              cycle: t.cycle,
              instruction: t.instruction,
              status: t.status,
              statusMap,
              pipeFetch: t.pipeFetch,
              pipeDecode: t.pipeDecode,
              pipeExecute: t.pipeExecute,
              pipeWriteback: t.pipeWriteback,
              computing: t.computing,
              waiting: t.waiting,
              loading: t.loading,
              aluDone: t.aluDone,
              vRegA: t.vRegA,
              vRegB: t.vRegB,
              vRegC: t.vRegC,
              elementProgress: t.elementProgress,
              batchProgress: t.batchProgress,
              empty: t.msgEmpty,
              msgFetch: t.msgFetchSimd,
              msgDecode: t.msgDecodeSimd,
              msgExec: t.msgExecSimd,
              msgWrite: t.msgWriteSimd,
            }}
          />
        </div>
      </section>

      {/* METRICS + TRACE */}
      <section className="mx-auto max-w-[1400px] px-6 py-4">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Metrics state={state} labels={t} />
          <TraceTable state={state} labels={t} />
        </div>
      </section>

      {/* ARCHITECTURE EXPLAINER */}
      <section className="mx-auto max-w-[1400px] px-6 py-12">
        <Panel title={t.archTitle} accent="cyan">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm leading-relaxed text-muted-foreground">{t.archDesc}</p>
              <div className="mt-4 space-y-2 font-mono text-xs">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-neon-cyan" />
                  <div>
                    <span className="text-neon-cyan">SISD</span>
                    <span className="text-muted-foreground">
                      {" "}— {lang === "tr" ? "1 komut, 1 veri, 1 saat vuruşu" : "1 instruction, 1 datum, 1 clock tick"}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-neon-magenta" />
                  <div>
                    <span className="text-neon-magenta">SIMD</span>
                    <span className="text-muted-foreground">
                      {" "}— {lang === "tr" ? `1 komut, ${laneCount} veri paralel, 1 saat vuruşu` : `1 instruction, ${laneCount} data in parallel, 1 clock tick`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded border border-border/40 bg-background/40 p-4 font-mono text-xs">
              <div className="mb-2 text-muted-foreground">// SISD pseudocode</div>
              <pre className="text-neon-cyan/90">{`for (int i = 0; i < N; i++) {
  C[i] = A[i] + B[i];   // ${state.sisdTotalCycles} cycles
}`}</pre>
              <div className="my-3 border-t border-border/40" />
              <div className="mb-2 text-muted-foreground">// SIMD pseudocode (×{laneCount})</div>
              <pre className="text-neon-magenta/90">{`for (int i = 0; i < N; i += ${laneCount}) {
  vec_add(&C[i], &A[i], &B[i]);   // ${state.simdTotalCycles} cycles
}`}</pre>
            </div>
          </div>
        </Panel>
      </section>

      {/* FOOTER */}
      <footer className="mt-8 border-t border-border/40 bg-background/40">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-6 py-6 font-mono text-xs text-muted-foreground md:flex-row">
          <div>{t.footer}</div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
              SYS.OK
            </span>
            <span>·</span>
            <span>BM208 İ.Ö · 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
