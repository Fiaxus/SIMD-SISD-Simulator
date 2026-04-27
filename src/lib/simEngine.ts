/**
 * SIMD vs SISD simülasyon motoru.
 *
 * Her işlem için bir komut listesi (program) üretiyoruz.
 * - SISD: her veri elemanı için ayrı bir cycle.
 * - SIMD: lane sayısı kadar elemanı tek bir cycle'da işler.
 *
 * Her step bir cycle ilerletir; UI bu state'i okuyarak animasyon gösterir.
 */

export type OpId =
  | "add"
  | "dot"
  | "matmul"
  | "brightness"
  | "grayscale"
  | "convolution"
  | "saxpy"
  | "euclid"
  | "fft";

export type Difficulty = "easy" | "medium" | "hard";
export type Packet = "vector" | "image" | "science";

/**
 * Her işlem için gerçekçi bir mikro-mimari profili.
 *
 *  - opsPerElement: Bir veri elemanını işlemek için kaç skaler μ-op gerekiyor.
 *      SISD bu maliyeti element başına SERİ olarak öder (n * opsPerElement cycle).
 *      SIMD ise lane'lere yayar — ANCAK aşağıdaki "parallelFraction" kadar.
 *
 *  - parallelFraction (P): Amdahl Yasası'ndaki paralelleştirilebilir oran.
 *      P=1.0  → embarrassingly parallel (vektör toplama, brightness)
 *      P<1.0  → reduction (toplama ağacı), data-dependency, butterfly aşaması seri kalır
 *      Speedup = 1 / ((1 - P) + P / N)
 *
 *  - simdSetup: Vektör yükleme/saklama + lane senkronizasyonu için sabit overhead (cycle).
 *      Gerçek donanımda VLOAD / VSTORE / mask kurulumu maliyetlidir.
 */
export const OP_META: Record<
  OpId,
  {
    packet: Packet;
    difficulty: Difficulty;
    dataSize: number;
    opsPerElement: number;
    parallelFraction: number; // Amdahl P
    simdSetup: number; // sabit vektör overhead (cycle)
  }
> = {
  // vector packet
  add:    { packet: "vector",  difficulty: "easy",   dataSize: 16, opsPerElement: 1, parallelFraction: 1.00, simdSetup: 2 },
  dot:    { packet: "vector",  difficulty: "medium", dataSize: 16, opsPerElement: 2, parallelFraction: 0.85, simdSetup: 4 }, // sum reduction seri
  matmul: { packet: "vector",  difficulty: "hard",   dataSize: 16, opsPerElement: 8, parallelFraction: 0.75, simdSetup: 6 }, // 4 mul + 4 add, kısmi seri
  // image packet
  brightness:  { packet: "image", difficulty: "easy",   dataSize: 16, opsPerElement: 1, parallelFraction: 1.00, simdSetup: 2 },
  grayscale:   { packet: "image", difficulty: "medium", dataSize: 16, opsPerElement: 3, parallelFraction: 0.95, simdSetup: 3 },
  convolution: { packet: "image", difficulty: "hard",   dataSize: 16, opsPerElement: 9, parallelFraction: 0.90, simdSetup: 5 }, // komşu erişim halo
  // science packet
  saxpy:  { packet: "science", difficulty: "easy",   dataSize: 16, opsPerElement: 2, parallelFraction: 0.98, simdSetup: 2 },
  euclid: { packet: "science", difficulty: "medium", dataSize: 16, opsPerElement: 3, parallelFraction: 0.80, simdSetup: 4 }, // sqrt + sum reduction
  fft:    { packet: "science", difficulty: "hard",   dataSize: 16, opsPerElement: 4, parallelFraction: 0.70, simdSetup: 6 }, // butterfly stages seri
};

export type Phase = "idle" | "fetch" | "decode" | "exec" | "write" | "done";

export interface CycleSnapshot {
  cycle: number;
  phase: Phase;
  // indices of A/B currently being processed
  active: number[];
  partialOut: (number | null)[];
  description: string;
}

export interface SimState {
  op: OpId;
  laneCount: number;
  A: number[];
  B: number[];
  // results
  sisdOut: (number | null)[];
  simdOut: (number | null)[];
  sisdCycle: number;
  simdCycle: number;
  sisdPhase: Phase;
  simdPhase: Phase;
  sisdActive: number[];
  simdActive: number[];
  // Pipeline ilerleme sayaçları — write fazı tamamlandığında artar.
  // Bu sayaç, "şu anda kaç eleman/batch tamamlandı" sorusunu out !== null'dan
  // bağımsız olarak yanıtlar; böylece motor EXEC fazında da out'a yazsa bile
  // bir sonraki elemana hemen atlamaz.
  sisdCompleted: number; // tamamlanmış eleman sayısı
  simdCompleted: number; // tamamlanmış batch sayısı
  sisdTotalCycles: number;
  simdTotalCycles: number;
  trace: { cycle: number; sisd: string; simd: string }[];
  finished: boolean;
}

export function generateData(op: OpId, seed = Date.now()): { A: number[]; B: number[] } {
  const meta = OP_META[op];
  const n = meta.dataSize;
  // simple deterministic-ish PRNG so randomize creates new but reasonable data
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0xffff) / 0xffff;
  };
  const isImg = meta.packet === "image";
  const A = Array.from({ length: n }, () => Math.round(rand() * (isImg ? 255 : 99)));
  const B = Array.from({ length: n }, () => Math.round(rand() * (isImg ? 255 : 99)));
  return { A, B };
}

function compute(op: OpId, a: number, b: number, idx: number, A: number[], B: number[]): number {
  switch (op) {
    case "add":
      return a + b;
    case "dot":
      return a * b; // partial; we sum at the end
    case "matmul": {
      // treat as 4x4: C[i] = sum_k A[row*4+k]*B[k*4+col]
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += A[row * 4 + k] * B[k * 4 + col];
      return sum;
    }
    case "brightness":
      return Math.min(255, a + 40);
    case "grayscale":
      // pretend a=R, b=G, and use a derived B channel
      return Math.round(0.3 * a + 0.59 * b + 0.11 * ((a + b) / 2));
    case "convolution": {
      // 3-tap blur on A using B as identity neighbor weights
      const left = A[(idx - 1 + A.length) % A.length];
      const right = A[(idx + 1) % A.length];
      return Math.round((left + a + right) / 3);
    }
    case "saxpy":
      return Math.round(2 * a + b);
    case "euclid":
      return (a - b) * (a - b); // partial; sqrt at end
    case "fft": {
      // simplified butterfly: u + v*cos
      const w = Math.cos((2 * Math.PI * idx) / A.length);
      return Math.round(a + b * w);
    }
  }
}

/**
 * Amdahl Yasası ile teorik SIMD cycle hesabı.
 *
 *   T_serial   = n * opsPerElement                          (SISD toplam iş)
 *   P          = parallelFraction
 *   T_parallel = T_serial * (1 - P)                         (paralelleştirilemeyen kısım, SIMD'de de seri kalır)
 *   T_speedup  = T_serial * P / N                           (lane'lere yayılan kısım — N = lane sayısı)
 *   T_simd     = T_parallel + T_speedup + simdSetup
 */
function computeSimdCycles(
  n: number,
  opsPerElement: number,
  parallelFraction: number,
  laneCount: number,
  simdSetup: number,
): number {
  const tSerial = n * opsPerElement;
  const serialPart = tSerial * (1 - parallelFraction);
  const parallelPart = (tSerial * parallelFraction) / Math.max(1, laneCount);
  return Math.ceil(serialPart + parallelPart + simdSetup);
}

export function createInitialState(op: OpId, laneCount: number, seed?: number): SimState {
  const { A, B } = generateData(op, seed);
  const meta = OP_META[op];
  const n = meta.dataSize;
  // Toplam cycle = element başına 4 pipeline aşaması (FETCH/DECODE/EXEC/WRITEBACK)
  // SISD: her eleman için 4 cycle.  SIMD: her batch için 4 cycle.
  const sisdTotal = n * 4;
  const simdBatches = Math.ceil(n / Math.max(1, laneCount));
  const simdTotal = simdBatches * 4;
  return {
    op,
    laneCount,
    A,
    B,
    sisdOut: Array(n).fill(null),
    simdOut: Array(n).fill(null),
    sisdCycle: 0,
    simdCycle: 0,
    sisdPhase: "idle",
    simdPhase: "idle",
    sisdActive: [],
    simdActive: [],
    sisdCompleted: 0,
    simdCompleted: 0,
    sisdTotalCycles: sisdTotal,
    simdTotalCycles: simdTotal,
    trace: [],
    finished: false,
  };
}

// Pipeline aşaması sırası — her cycle bir adım ilerler.
const PHASE_SEQUENCE: Phase[] = ["fetch", "decode", "exec", "write"];
function nextPhase(p: Phase): Phase {
  const i = PHASE_SEQUENCE.indexOf(p);
  if (i < 0) return "fetch";
  return PHASE_SEQUENCE[(i + 1) % PHASE_SEQUENCE.length];
}

/**
 * Bir tick = 1 saat vuruşu = pipeline'da bir aşama ilerleme.
 *
 * Klasik 4-fazlı pipeline:
 *   FETCH    → komut bellekten alınır
 *   DECODE   → komut çözümlenir, operand register'lar belirlenir
 *   EXECUTE  → ALU veriyi işler  (sonuç burada hesaplanır)
 *   WRITEBACK→ sonuç register dosyasına yazılır
 *
 * SISD: her eleman için 4 cycle.
 * SIMD: her batch (laneCount eleman) için 4 cycle — paralellik buradan gelir.
 */
export function tick(state: SimState): SimState {
  const n = state.A.length;

  // Eğer her iki taraf da bittiyse hiçbir şey yapma.
  if (state.finished || (state.sisdPhase === "done" && state.simdPhase === "done")) {
    return {
      ...state,
      finished: true,
      sisdPhase: "done",
      simdPhase: "done",
      sisdActive: [],
      simdActive: [],
      sisdCycle: state.sisdTotalCycles,
      simdCycle: state.simdTotalCycles,
    };
  }

  const newSisd = [...state.sisdOut];
  const newSimd = [...state.simdOut];

  // ── SISD ───────────────────────────────────────────────────────────────
  // Aktif eleman = sisdCompleted (sayaç). out !== null kullanmıyoruz çünkü
  // EXEC fazında out'a yazıyoruz ama eleman henüz "tamamlanmış" sayılmaz.
  let sisdCompleted = state.sisdCompleted;
  const sisdElemIdx = sisdCompleted; // şu an üzerinde çalışılan eleman
  const sisdFinished = sisdElemIdx >= n;

  let sisdPhase: Phase = state.sisdPhase;
  let sisdActive: number[] = [];
  let sisdCycleAdvance = 0;

  if (sisdFinished) {
    sisdPhase = "done";
  } else {
    // İdle veya bir önceki elemanın "write" fazından sonraysa FETCH'le başla.
    if (state.sisdPhase === "idle" || state.sisdPhase === "write" || state.sisdPhase === "done") {
      sisdPhase = "fetch";
    } else {
      sisdPhase = nextPhase(state.sisdPhase);
    }
    sisdActive = [sisdElemIdx];
    sisdCycleAdvance = 1;

    // EXECUTE fazında ALU sonucu hesaplar — out'a yazıyoruz ki UI ALU içinde gösterebilsin.
    if (sisdPhase === "exec") {
      newSisd[sisdElemIdx] = compute(
        state.op,
        state.A[sisdElemIdx],
        state.B[sisdElemIdx],
        sisdElemIdx,
        state.A,
        state.B,
      );
    }
    // WRITEBACK fazında eleman tamamlanır → register dosyasına yazıldı.
    if (sisdPhase === "write") {
      // Güvence: exec atlandıysa burada da hesapla.
      if (newSisd[sisdElemIdx] === null) {
        newSisd[sisdElemIdx] = compute(
          state.op,
          state.A[sisdElemIdx],
          state.B[sisdElemIdx],
          sisdElemIdx,
          state.A,
          state.B,
        );
      }
      sisdCompleted = sisdElemIdx + 1;
    }
  }

  // ── SIMD ───────────────────────────────────────────────────────────────
  let simdCompleted = state.simdCompleted; // tamamlanmış batch sayısı
  const simdBatchStart = simdCompleted * state.laneCount;
  const simdFinished = simdBatchStart >= n;

  let simdPhase: Phase = state.simdPhase;
  let simdActive: number[] = [];
  let simdCycleAdvance = 0;

  if (simdFinished) {
    simdPhase = "done";
  } else {
    if (state.simdPhase === "idle" || state.simdPhase === "write" || state.simdPhase === "done") {
      simdPhase = "fetch";
    } else {
      simdPhase = nextPhase(state.simdPhase);
    }
    const start = simdBatchStart;
    const end = Math.min(start + state.laneCount, n);
    for (let i = start; i < end; i++) simdActive.push(i);
    simdCycleAdvance = 1;

    if (simdPhase === "exec") {
      for (let i = start; i < end; i++) {
        newSimd[i] = compute(state.op, state.A[i], state.B[i], i, state.A, state.B);
      }
    }
    if (simdPhase === "write") {
      for (let i = start; i < end; i++) {
        if (newSimd[i] === null) {
          newSimd[i] = compute(state.op, state.A[i], state.B[i], i, state.A, state.B);
        }
      }
      simdCompleted += 1;
    }
  }

  // ── trace ──────────────────────────────────────────────────────────────
  const trace = [
    ...state.trace,
    {
      cycle: state.trace.length + 1,
      sisd: sisdActive.length
        ? `${sisdPhase.toUpperCase()} A[${sisdActive[0]}], B[${sisdActive[0]}]`
        : "—",
      simd: simdActive.length
        ? `${simdPhase.toUpperCase()} A[${simdActive[0]}..${simdActive[simdActive.length - 1]}]`
        : "—",
    },
  ];

  const sisdAllDone = sisdCompleted >= n;
  const simdAllDone = simdCompleted * state.laneCount >= n;
  const allDone = sisdAllDone && simdAllDone;

  const nextSisdCycle = sisdFinished
    ? state.sisdTotalCycles
    : Math.min(state.sisdTotalCycles, state.sisdCycle + sisdCycleAdvance);
  const nextSimdCycle = simdFinished
    ? state.simdTotalCycles
    : Math.min(state.simdTotalCycles, state.simdCycle + simdCycleAdvance);

  return {
    ...state,
    sisdOut: newSisd,
    simdOut: newSimd,
    sisdCycle: nextSisdCycle,
    simdCycle: nextSimdCycle,
    sisdCompleted,
    simdCompleted,
    sisdPhase: sisdAllDone ? "done" : sisdPhase,
    simdPhase: simdAllDone ? "done" : simdPhase,
    sisdActive: sisdAllDone ? [] : sisdActive,
    simdActive: simdAllDone ? [] : simdActive,
    trace,
    finished: allDone,
  };
}

export function exportCsv(state: SimState): string {
  const lines = ["cycle,sisd_op,simd_op"];
  state.trace.forEach((t) => lines.push(`${t.cycle},"${t.sisd}","${t.simd}"`));
  lines.push("");
  lines.push(`metric,sisd,simd`);
  lines.push(`total_cycles,${state.sisdCycle},${state.simdCycle}`);
  lines.push(
    `throughput_op_per_cycle,${(state.A.length / Math.max(1, state.sisdCycle)).toFixed(3)},${(
      state.A.length / Math.max(1, state.simdCycle)
    ).toFixed(3)}`,
  );
  lines.push(`speedup,${(state.sisdCycle / Math.max(1, state.simdCycle)).toFixed(2)}x`);
  return lines.join("\n");
}
