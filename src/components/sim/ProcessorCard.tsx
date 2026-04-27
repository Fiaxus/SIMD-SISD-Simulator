import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import type { Phase } from "@/lib/simEngine";
import { cn } from "@/lib/utils";

/**
 * 4-fazlı klasik pipeline görselleştirmesi:
 *   FETCH → DECODE → EXECUTE → WRITEBACK
 *
 *  • FETCH/DECODE  : ALU "LOADING" — operandlar yüklenir, OUT henüz yok.
 *  • EXECUTE       : ALU "COMPUTING" — sonuç hesaplandı, ALU içinde görünür.
 *  • WRITEBACK     : ALU "DONE" — sonuç register dosyasına yazıldı.
 *
 *  motor (simEngine.tick): EXECUTE'da hesaplar, WRITEBACK'te `out`'a yazar.
 */

interface ProcessorCardProps {
  variant: "sisd" | "simd";
  title: string;
  subtitle: string;
  A: number[];
  B: number[];
  out: (number | null)[];
  active: number[];
  cycle: number;
  totalCycles: number;
  phase: Phase;
  laneCount: number;
  labels: {
    registers: string;
    aluUnit: string;
    aluUnitSimd?: string;
    output: string;
    cycle: string;
    instruction: string;
    status: string;
    statusMap: Record<Phase, string>;
    pipeFetch?: string;
    pipeDecode?: string;
    pipeExecute?: string;
    pipeWriteback?: string;
    computing?: string;
    waiting?: string;
    loading?: string;
    aluDone?: string;
    vRegA?: string;
    vRegB?: string;
    vRegC?: string;
    elementProgress?: string;
    batchProgress?: string;
    empty?: string;
    msgFetch?: string;
    msgDecode?: string;
    msgExec?: string;
    msgWrite?: string;
  };
  instructionText: string;
}

export function ProcessorCard(props: ProcessorCardProps) {
  const isSimd = props.variant === "simd";
  const accent = isSimd ? "magenta" : "cyan";

  // Faz başına renk teması — referans görsellere göre.
  //   FETCH  → mavi   (loading)
  //   DECODE → mor    (decoding)
  //   EXEC   → yeşil  (computing)
  //   WRITE  → varyantın kendi rengi (cyan / magenta)
  type PhaseKey = "fetch" | "decode" | "exec" | "write";
  const phaseTheme: Record<PhaseKey, { text: string; bg: string; border: string; glow: string }> = {
    fetch: {
      text: "text-[oklch(0.78_0.16_240)]",
      bg: "bg-[oklch(0.78_0.16_240/0.15)]",
      border: "border-[oklch(0.78_0.16_240/0.5)]",
      glow: "shadow-[0_0_18px_oklch(0.78_0.16_240/0.45)]",
    },
    decode: {
      text: "text-[oklch(0.72_0.18_300)]",
      bg: "bg-[oklch(0.72_0.18_300/0.15)]",
      border: "border-[oklch(0.72_0.18_300/0.5)]",
      glow: "shadow-[0_0_18px_oklch(0.72_0.18_300/0.45)]",
    },
    exec: {
      text: "text-neon-green",
      bg: "bg-neon-green/15",
      border: "border-neon-green/50",
      glow: "shadow-[0_0_18px_oklch(0.82_0.14_165/0.5)]",
    },
    write: isSimd
      ? {
          text: "text-neon-magenta",
          bg: "bg-neon-magenta/15",
          border: "border-neon-magenta/50",
          glow: "shadow-[0_0_18px_oklch(0.78_0.16_65/0.5)]",
        }
      : {
          text: "text-neon-amber",
          bg: "bg-neon-amber/15",
          border: "border-neon-amber/50",
          glow: "shadow-[0_0_18px_oklch(0.78_0.18_55/0.5)]",
        },
  };

  const accentRing = isSimd ? "border-neon-magenta/50" : "border-neon-cyan/50";
  const accentText = isSimd ? "text-neon-magenta" : "text-neon-cyan";
  const accentDot = isSimd ? "bg-neon-magenta" : "bg-neon-cyan";

  const lanesShown = isSimd ? props.laneCount : 1;
  const totalElems = props.A.length;

  // Aktif faz türü
  const phase = props.phase;
  const isFetch = phase === "fetch";
  const isDecode = phase === "decode";
  const isExec = phase === "exec";
  const isWrite = phase === "write";
  const isDone = phase === "done";
  const isIdle = phase === "idle";

  // Aktif element / batch indeksi
  const baseIdx = props.active.length > 0 ? props.active[0] : -1;

  // ── Pipeline pill aktiflik ────────────────────────────────────────────
  const phaseKeys: PhaseKey[] = ["fetch", "decode", "exec", "write"];
  const pipeLabels = [
    props.labels.pipeFetch ?? "FETCH",
    props.labels.pipeDecode ?? "DECODE",
    props.labels.pipeExecute ?? "EXECUTE",
    props.labels.pipeWriteback ?? "WRITEBACK",
  ];
  const activePipeIdx = isFetch ? 0 : isDecode ? 1 : isExec ? 2 : isWrite || isDone ? 3 : -1;

  // ── ALU badge etiketi (LOADING / COMPUTING / DONE / WAITING) ──────────
  const aluBadge = (() => {
    if (isFetch || isDecode) return { label: props.labels.loading ?? "LOADING", key: phase as PhaseKey };
    if (isExec) return { label: props.labels.computing ?? "COMPUTING", key: "exec" as PhaseKey };
    if (isWrite || isDone) return { label: props.labels.aluDone ?? "DONE", key: "write" as PhaseKey };
    return { label: props.labels.waiting ?? "WAITING", key: "fetch" as PhaseKey };
  })();

  // ALU içinde gösterilecek hesaplanmış sonuç — sadece exec/write/done'da göster.
  // EXEC fazında out'a henüz yazılmamış olabilir (motor write'ta yazıyor) — bu yüzden
  // exec sırasında "preview" değer hesaplamak yerine, exec fazında out hücresini direkt
  // göstermek için motor exec'te de hesaplamamış olabilir → bu durumda bağımsız bir
  // önizleme hesabı yapmak yerine kullanıcı write'a geçince OUT'un dolduğunu görür.
  // Referans görselde EXEC'te OUT zaten dolu — bunu sağlamak için motora ek "preview"
  // gerekirdi; pratik çözüm: out doluysa göster, değilse "—".

  // ── Alt status mesajı ──────────────────────────────────────────────────
  const phaseMsg =
    isFetch ? (props.labels.msgFetch ?? "Fetch")
    : isDecode ? (props.labels.msgDecode ?? "Decode")
    : isExec ? (props.labels.msgExec ?? "Execute")
    : isWrite ? (props.labels.msgWrite ?? "Writeback")
    : isDone ? props.labels.statusMap.done
    : "—";

  const elemDone = props.out.filter((v) => v !== null).length;
  // Geçerli element/batch indeksi (1-based gösterim)
  const currentElement =
    baseIdx >= 0 ? baseIdx + 1 : isDone ? totalElems : Math.min(elemDone + 1, totalElems);
  const currentBatch =
    baseIdx >= 0
      ? Math.floor(baseIdx / Math.max(1, props.laneCount)) + 1
      : isDone
        ? Math.ceil(totalElems / Math.max(1, props.laneCount))
        : Math.min(
            Math.ceil(elemDone / Math.max(1, props.laneCount)) + 1,
            Math.ceil(totalElems / Math.max(1, props.laneCount)),
          );
  const totalBatches = Math.ceil(totalElems / Math.max(1, props.laneCount));

  const statusLine = isIdle
    ? "—"
    : isSimd
      ? `${props.labels.batchProgress ?? "Batch"} ${currentBatch}/${totalBatches} — ${phaseMsg}`
      : `${props.labels.elementProgress ?? "Element"} ${currentElement}/${totalElems} — ${phaseMsg}`;

  // SISD için skalar register C — sadece son yazılan (en güncel) eleman için göster.
  const lastSisdIdx = elemDone > 0 ? elemDone - 1 : -1;
  // Aktif tur o anda SISD'de işleniyorsa (write fazı dahil) baseIdx kullan, aksi hâlde son tamamlanan.
  const sisdShownIdx = baseIdx >= 0 ? baseIdx : lastSisdIdx;
  const showSisdC = baseIdx >= 0 ? isWrite || isDone : lastSisdIdx >= 0;

  return (
    <div className={cn("panel relative overflow-hidden scanlines flex flex-col", accentRing, isSimd && "panel-magenta")}>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full animate-pulse-glow", accentDot)} />
            <h3 className="font-display text-lg font-semibold tracking-tight">{props.title}</h3>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {props.subtitle}
            {isSimd && (
              <>
                {" · "}
                <span className={accentText}>{props.laneCount}-wide</span>
              </>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className={cn("font-mono text-3xl font-bold tabular-nums leading-none", accentText)}>
            {String(props.cycle).padStart(3, "0")}
          </div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {props.labels.cycle}
          </div>
        </div>
      </div>

      {/* PIPELINE PILLS */}
      <div className="flex flex-wrap items-center gap-1.5 px-5 pb-4">
        {pipeLabels.map((lbl, i) => {
          const on = activePipeIdx === i;
          const k = phaseKeys[i];
          const th = phaseTheme[k];
          return (
            <div
              key={lbl + i}
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-all",
                on
                  ? cn(th.border, th.bg, th.text, th.glow)
                  : "border-border/40 bg-background/40 text-muted-foreground/60",
              )}
            >
              {lbl}
            </div>
          );
        })}
      </div>

      {/* ALU SECTION */}
      <div className="px-5 pb-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {isSimd ? `${props.labels.aluUnitSimd ?? props.labels.aluUnit} (${props.laneCount}×)` : `${props.labels.aluUnit} (1×)`}
        </div>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: isSimd ? `repeat(${Math.min(lanesShown, 4)}, minmax(0, 1fr))` : "1fr" }}
        >
          {Array.from({ length: lanesShown }).map((_, laneIdx) => {
            const elemIdx = baseIdx >= 0 ? baseIdx + laneIdx : -1;
            const inRange = elemIdx >= 0 && elemIdx < props.A.length;
            const aVal = inRange ? props.A[elemIdx] : null;
            const bVal = inRange ? props.B[elemIdx] : null;

            // OUT görünümü:
            //   FETCH/DECODE → "—"
            //   EXEC          → motor exec'te henüz yazmadığı için yine "—" göstermemek
            //                   adına burada "preview" hesabı yapmıyoruz; ancak motor exec
            //                   sonunda write'a geçer ve out dolar. Bunun yerine aşağıda
            //                   aluActive iken exec/write/done durumunda out[elemIdx]'i
            //                   gösteriyoruz (motor exec'te de hesaplayabilir → bkz tick).
            //   WRITE/DONE    → register'a yazıldı, dolu.
            const outVal = inRange ? props.out[elemIdx] : null;
            const showOut = (isExec || isWrite || isDone) && outVal !== null;

            const aluActive = props.active.includes(elemIdx);
            const th = phaseTheme[aluBadge.key];

            return (
              <motion.div
                key={laneIdx}
                animate={aluActive ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "rounded-md border bg-background/40 p-2.5 transition-all",
                  aluActive ? cn(th.border, th.bg, th.glow) : "border-border/40",
                )}
              >
                {/* lane header */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cpu className={cn("h-3 w-3", aluActive ? th.text : "text-muted-foreground/60")} />
                    <span className={cn("font-mono text-[10px] font-semibold tracking-wider", aluActive ? th.text : "text-muted-foreground")}>
                      ALU{laneIdx}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em]",
                      aluActive
                        ? cn(th.border, th.bg, th.text)
                        : "border-border/40 bg-background/60 text-muted-foreground/50",
                    )}
                  >
                    {aluActive ? aluBadge.label : (props.labels.waiting ?? "WAITING")}
                  </span>
                </div>

                {/* A / B / OUT rows */}
                <div className="space-y-1">
                  <RegRow label="A" value={aVal} active={aluActive} />
                  <RegRow label="B" value={bVal} active={aluActive} />
                  <OutRow
                    value={showOut ? outVal : null}
                    active={aluActive}
                    themeText={th.text}
                    themeBg={th.bg}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* REGISTER FILE */}
      <div className="px-5 pb-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {props.labels.registers}
        </div>
        {isSimd ? (() => {
          // SISD ile aynı mantık: register dosyası simülasyon ilerledikçe dolar.
          // - Idle: tüm vektörler boş.
          // - Aktif batch: VA ve VB FETCH'ten itibaren o batch'in elemanlarıyla dolu;
          //   VC ise sadece WRITE/DONE fazında dolu (sonuç register'a o zaman yazılır).
          // - Tamamlanmış batch'ler: ilgili sliceler dolu kalır (props.out zaten taşıyor).
          const laneN = Math.max(1, props.laneCount);
          const batchStart = baseIdx >= 0 ? Math.floor(baseIdx / laneN) * laneN : -1;
          const batchEnd = batchStart >= 0 ? Math.min(batchStart + laneN, props.A.length) : -1;
          // VA / VB: tamamlanmış batch'ler + aktif batch görünür.
          // Tamamlanmış eleman sayısı = out içinde non-null sayısı.
          const completedCount = props.out.filter((v) => v !== null).length;
          const loadedUntil = isIdle
            ? 0
            : baseIdx >= 0
              ? batchEnd // aktif batch dahil (FETCH'ten itibaren)
              : isDone
                ? props.A.length
                : completedCount;
          const vaShown: (number | null)[] = props.A.map((v, i) => (i < loadedUntil ? v : null));
          const vbShown: (number | null)[] = props.B.map((v, i) => (i < loadedUntil ? v : null));
          // VC: sadece tamamlanmış (write fazından geçmiş) elemanlar dolu — props.out zaten bunu yansıtıyor.
          // Ancak EXEC fazında motor out'a yazıyor; UI'da VC'nin EXEC'te değil WRITE'ta dolması için
          // aktif batch elemanlarını sadece write/done'da göster.
          const vcShown: (number | null)[] = props.out.map((v, i) => {
            if (v === null) return null;
            // Aktif batch içindeki elemanları sadece write/done fazında göster.
            if (batchStart >= 0 && i >= batchStart && i < batchEnd) {
              return isWrite || isDone ? v : null;
            }
            return v;
          });
          return (
            <div className="space-y-1.5">
              <VectorRegRow
                label={props.labels.vRegA ?? "VA"}
                values={vaShown}
                filled
                empty={props.labels.empty ?? "[empty]"}
                showOnlyFilled
              />
              <VectorRegRow
                label={props.labels.vRegB ?? "VB"}
                values={vbShown}
                filled
                empty={props.labels.empty ?? "[empty]"}
                showOnlyFilled
              />
              <VectorRegRow
                label={props.labels.vRegC ?? "VC"}
                values={vcShown}
                accentText={accentText}
                empty={props.labels.empty ?? "[empty]"}
                showOnlyFilled
              />
            </div>
          );
        })() : (
          <div className="space-y-1">
            <ScalarRow label="A" value={sisdShownIdx >= 0 ? props.A[sisdShownIdx] : null} />
            <ScalarRow label="B" value={sisdShownIdx >= 0 ? props.B[sisdShownIdx] : null} />
            <ScalarRow
              label="C"
              value={showSisdC && sisdShownIdx >= 0 ? props.out[sisdShownIdx] : null}
              highlight
              accentText={isSimd ? "text-neon-magenta" : "text-neon-amber"}
              empty={props.labels.empty ?? "[empty]"}
            />
          </div>
        )}
      </div>

      {/* STATUS LINE */}
      <div className="mt-auto border-t border-border/40 px-5 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span className={accentText}>›</span>
          <span>{statusLine}</span>
        </div>
      </div>
    </div>
  );
}

/* ───────── helpers ───────── */

function RegRow({ label, value, active }: { label: string; value: number | null; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded px-2 py-1 font-mono text-[11px] tabular-nums">
      <span className="text-[10px] tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", active ? "text-foreground" : "text-foreground/60")}>
        {value ?? "·"}
      </span>
    </div>
  );
}

function OutRow({
  value,
  active,
  themeText,
  themeBg,
}: {
  value: number | null;
  active: boolean;
  themeText: string;
  themeBg: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded px-2 py-1 font-mono text-[11px] tabular-nums",
        active && value !== null ? cn(themeBg, themeText) : "bg-background/60 text-muted-foreground",
      )}
    >
      <span className="text-[10px] font-semibold tracking-wider">OUT</span>
      <span className="font-semibold">{value ?? "—"}</span>
    </div>
  );
}

function ScalarRow({
  label,
  value,
  highlight,
  accentText,
  empty,
}: {
  label: string;
  value: number | null | undefined;
  highlight?: boolean;
  accentText?: string;
  empty?: string;
}) {
  const isEmpty = value === null || value === undefined;
  return (
    <div className="grid grid-cols-[2rem_1fr] items-center gap-3 rounded border border-border/40 bg-background/40 px-3 py-1.5">
      <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right font-mono text-[12px] font-semibold tabular-nums",
          isEmpty
            ? "text-muted-foreground/50"
            : highlight
              ? accentText ?? "text-neon-amber"
              : "text-foreground/80",
        )}
      >
        {isEmpty ? (empty ?? "[empty]") : value}
      </span>
    </div>
  );
}

function VectorRegRow({
  label,
  values,
  accentText,
  filled,
  showOnlyFilled,
  empty,
}: {
  label: string;
  values: (number | null)[];
  accentText?: string;
  filled?: boolean;
  showOnlyFilled?: boolean;
  empty?: string;
}) {
  const shown = values.slice(0, 4);
  const allEmpty = showOnlyFilled && shown.every((v) => v === null);

  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {allEmpty ? (
        <span className="font-mono text-[11px] text-muted-foreground/50">{empty ?? "[empty]"}</span>
      ) : (
        <div className="grid grid-cols-4 gap-1">
          {shown.map((v, i) => {
            const isEmpty = v === null;
            return (
              <div
                key={i}
                className={cn(
                  "rounded border bg-background/60 px-2 py-1 text-center font-mono text-[11px] tabular-nums",
                  isEmpty
                    ? "border-border/30 text-muted-foreground/40"
                    : filled
                      ? "border-border/40 text-foreground/80"
                      : cn("border-current/40", accentText ?? "text-neon-cyan"),
                )}
              >
                {v ?? "·"}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
