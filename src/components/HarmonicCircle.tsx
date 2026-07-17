import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildScale, harmonicField, keySignature, armaduraLabel, relativeKey,
  MODE_LABEL, ScaleMode, Notation, pretty, noteToPc, SHARP_NAMES, FLAT_NAMES,
} from "@/lib/theory";

type Props = {
  currentKey: string;        // e.g. "G", "Am", "F#m"
  onSelectKey: (key: string) => void;
  className?: string;
};

// Order of pitch classes around the circle of fifths starting from C.
const FIFTHS_PCS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // C G D A E B F# C# G# D# A# F

function parseKey(k: string): { tonicPc: number; mode: ScaleMode; tonicName: string } {
  const isMinor = k.endsWith("m") && !k.endsWith("dim");
  const root = isMinor ? k.slice(0, -1) : k;
  const pc = noteToPc(root) ?? 0;
  return { tonicPc: pc, mode: isMinor ? "minor" : "major", tonicName: root };
}

function chordName(pc: number, quality: "M" | "m" | "d", preferFlats: boolean): string {
  const root = (preferFlats ? FLAT_NAMES : SHARP_NAMES)[pc];
  if (quality === "M") return root;
  if (quality === "m") return root + "m";
  return root + "°";
}

// Names for both spellings (used only when notation="auto" and the PC has both).
function bothSpellings(pc: number): string[] {
  const s = SHARP_NAMES[pc];
  const f = FLAT_NAMES[pc];
  return s === f ? [s] : [s, f];
}

const DEG_COLORS = [
  "hsl(var(--primary))",              // 1 - Tonic
  "hsl(174 62% 47% / 0.72)",          // 2
  "hsl(142 55% 45% / 0.65)",          // 3
  "hsl(217 91% 60% / 0.68)",          // 4
  "hsl(0 72% 51% / 0.68)",            // 5
  "hsl(280 60% 55% / 0.65)",          // 6
  "hsl(43 96% 56% / 0.78)",           // 7
];

export function HarmonyPanel({ currentKey, onSelectKey, className }: Props) {
  const parsed = parseKey(currentKey);
  const [mode, setMode] = useState<ScaleMode>(parsed.mode);
  const [notation, setNotation] = useState<Notation>("auto");
  const [direction, setDirection] = useState<"fifths" | "fourths">("fifths");

  // Keep mode in sync when parent's key type changes (major<->minor).
  // (Only lazy on mount; user can pick harmonic/melodic freely.)

  const tonicPc = parsed.tonicPc;
  const tonic = useMemo(() => {
    // Re-spell tonic per notation preference for display / scale build.
    const useFlats = notation === "flat" || (notation === "auto" && parsed.tonicName.includes("b"));
    return (useFlats ? FLAT_NAMES : SHARP_NAMES)[tonicPc];
  }, [tonicPc, notation, parsed.tonicName]);

  const scale = useMemo(() => buildScale(tonic, mode, notation), [tonic, mode, notation]);
  const field = useMemo(() => harmonicField(tonic, mode, notation), [tonic, mode, notation]);
  const sig   = keySignature(tonic, mode);
  const rel   = relativeKey(tonic, mode);

  // Map each field entry to its PC to color/highlight the circle.
  const fieldByPc = useMemo(() => {
    const m = new Map<number, { deg: number; quality: string; chord: string }>();
    field.forEach((f, i) => {
      const pc = noteToPc(f.root);
      if (pc != null) m.set(pc, { deg: i + 1, quality: f.quality, chord: f.chord });
    });
    return m;
  }, [field]);

  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 180;
  const rMid1  = 138; // dim / minor boundary
  const rMid2  = 100; // minor / major boundary
  const rInner = 60;
  const rCenter = 42;

  const order = direction === "fifths" ? FIFTHS_PCS : [...FIFTHS_PCS].reverse().map((_, i, arr) => arr[(i) % 12] ?? FIFTHS_PCS[0]);
  // Correct fourths order = reverse of fifths (still starting from C):
  const pcsOrder = direction === "fifths"
    ? FIFTHS_PCS
    : [FIFTHS_PCS[0], ...FIFTHS_PCS.slice(1).reverse()];

  const segments = useMemo(() => {
    const s = (2 * Math.PI) / 12;
    return Array.from({ length: 12 }, (_, i) => {
      const a0 = -Math.PI / 2 + (i - 0.5) * s;
      const a1 = -Math.PI / 2 + (i + 0.5) * s;
      const midA = -Math.PI / 2 + i * s;
      return { a0, a1, midA };
    });
  }, []);

  const arc = (r1: number, r2: number, a0: number, a1: number) => {
    const x0 = cx + r2 * Math.cos(a0);
    const y0 = cy + r2 * Math.sin(a0);
    const x1 = cx + r2 * Math.cos(a1);
    const y1 = cy + r2 * Math.sin(a1);
    const x2 = cx + r1 * Math.cos(a1);
    const y2 = cy + r1 * Math.sin(a1);
    const x3 = cx + r1 * Math.cos(a0);
    const y3 = cy + r1 * Math.sin(a0);
    return `M ${x0} ${y0} A ${r2} ${r2} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${r1} ${r1} 0 0 0 ${x3} ${y3} Z`;
  };

  // For each ring, decide fill: highlight if this PC+quality matches a field entry.
  const fillFor = (pc: number, ring: "M" | "m" | "d") => {
    const entry = fieldByPc.get(pc);
    if (!entry) return ring === "d" ? "hsl(var(--muted) / 0.28)" : ring === "m" ? "hsl(var(--muted) / 0.45)" : "hsl(var(--muted) / 0.7)";
    const qMap: Record<string, string> = { maj: "M", min: "m", dim: "d", aug: "M" };
    if (qMap[entry.quality] !== ring) {
      return ring === "d" ? "hsl(var(--muted) / 0.28)" : ring === "m" ? "hsl(var(--muted) / 0.45)" : "hsl(var(--muted) / 0.7)";
    }
    return DEG_COLORS[entry.deg - 1];
  };

  const preferFlats = notation === "flat" || (notation === "auto" && tonic.includes("b"));

  const renderRing = (
    r1: number,
    r2: number,
    ring: "M" | "m" | "d",
    fontSize: number,
    weight: number,
    keyPrefix: string,
  ) =>
    segments.map((s, i) => {
      const pc = pcsOrder[i];
      const midR = (r1 + r2) / 2;
      const tx = cx + midR * Math.cos(s.midA);
      const ty = cy + midR * Math.sin(s.midA);

      const chord = chordName(pc, ring, preferFlats);
      const entry = fieldByPc.get(pc);
      const isFieldMember = entry && ({ maj: "M", min: "m", dim: "d", aug: "M" } as any)[entry.quality] === ring;
      const isTonic = isFieldMember && entry!.deg === 1;

      // Show alternate spelling only in Auto mode for accidental PCs, on the major ring.
      const showAlt = notation === "auto" && ring === "M" && [1, 3, 6, 8, 10].includes(pc);
      const spellings = showAlt ? bothSpellings(pc) : [chord];
      const labelParts = spellings.map((n) => {
        if (ring === "m") return pretty(n) + "m";
        if (ring === "d") return pretty(n) + "°";
        return pretty(n);
      });
      const labelFontSize = labelParts.length > 1 ? Math.max(9, fontSize - 2) : fontSize;

      return (
        <g
          key={`${keyPrefix}${i}`}
          className="cursor-pointer transition-transform"
          onClick={() => onSelectKey(chord)}
          style={isTonic ? { filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.8))" } : undefined}
        >
          <path
            d={arc(r1, r2, s.a0, s.a1)}
            fill={fillFor(pc, ring)}
            stroke={isTonic ? "hsl(var(--primary))" : "hsl(var(--border))"}
            strokeWidth={isTonic ? 2.5 : 1}
          />
          <text
            x={tx}
            y={ty}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground pointer-events-none select-none"
            fontSize={labelFontSize}
            fontWeight={weight}
          >
            {labelParts.length === 1 ? labelParts[0] : (
              labelParts.map((p, idx) => (
                <tspan key={p} x={tx} dy={idx === 0 ? "-0.38em" : "1.05em"}>{p}</tspan>
              ))
            )}
          </text>
          {isFieldMember && (
            <text
              x={cx + (r1 - 8) * Math.cos(s.midA)}
              y={cy + (r1 - 8) * Math.sin(s.midA)}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground/70 pointer-events-none select-none"
              fontSize={8}
              fontWeight={800}
            >
              {field[entry!.deg - 1].degreeRoman}
            </text>
          )}
        </g>
      );
    });

  return (
    <div className={cn("flex w-[420px] flex-col gap-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
          {(["major", "minor", "harmonic", "melodic"] as ScaleMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {MODE_LABEL[m].replace("Menor ", "m ").replace("Maior Natural", "Maior")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
          {(["auto", "sharp", "flat"] as Notation[]).map((n) => (
            <button
              key={n}
              onClick={() => setNotation(n)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                notation === n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {n === "auto" ? "Auto" : n === "sharp" ? "♯" : "♭"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
          <button
            onClick={() => setDirection("fifths")}
            className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
              direction === "fifths" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >Quintas</button>
          <button
            onClick={() => setDirection("fourths")}
            className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
              direction === "fourths" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >Quartas</button>
        </div>
      </div>

      {/* Circle */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        {renderRing(rMid1,  rOuter, "d", 11, 700, "d")}
        {renderRing(rMid2,  rMid1,  "m", 12, 600, "m")}
        {renderRing(rInner, rMid2,  "M", 13, 700, "M")}

        <circle cx={cx} cy={cy} r={rCenter} fill="hsl(var(--surface))" stroke="hsl(var(--border))" />
        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="central"
              className="fill-muted-foreground select-none" fontSize={9} fontWeight={600}>TOM</text>
        <text x={cx} y={cy + 7} textAnchor="middle" dominantBaseline="central"
              className="fill-foreground select-none" fontSize={16} fontWeight={800}>
          {pretty(tonic)}{mode !== "major" ? "m" : ""}
        </text>
      </svg>

      {/* Info */}
      <div className="rounded-xl border border-border bg-surface p-3 text-[12px]">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span><span className="text-muted-foreground">Tom:</span> <b>{pretty(tonic)}{mode !== "major" ? "m" : ""}</b></span>
          <span><span className="text-muted-foreground">Modo:</span> {MODE_LABEL[mode]}</span>
          <span><span className="text-muted-foreground">Armadura:</span> {armaduraLabel(sig)}</span>
          {rel && <span><span className="text-muted-foreground">Relativo:</span> {pretty(rel.tonic)}{rel.mode !== "major" ? "m" : ""}</span>}
        </div>
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Escala</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {scale.map((n) => (
              <span key={n} className="rounded-md border border-border bg-background px-2 py-0.5 font-mono">{pretty(n)}</span>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Campo Harmônico</div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-center">
            {field.map((f, i) => (
              <button
                key={i}
                onClick={() => onSelectKey(f.chord)}
                className="rounded-md border border-border bg-background px-1 py-1 hover:bg-muted transition-colors"
                title={f.functionName}
              >
                <div className="text-[10px] font-bold text-foreground/70" style={{ color: DEG_COLORS[i] }}>{f.degreeRoman}</div>
                <div className="text-[12px] font-semibold">{pretty(f.chord)}</div>
              </button>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[9px] text-muted-foreground">
            {field.map((f, i) => (<div key={i}>{f.functionName}</div>))}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] leading-snug text-muted-foreground">
        Clique em qualquer acorde do círculo ou do campo harmônico para defini-lo como Tom Atual.
      </p>
    </div>
  );
}

// Backwards-compat named export used by existing imports.
export { HarmonyPanel as HarmonicCircle };
