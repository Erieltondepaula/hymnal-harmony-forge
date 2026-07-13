import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// Circle labels show both enharmonic spellings for accidentals.
// Values keep common song-chart spellings so transposition still receives C#/Db style keys.
const FIFTHS         = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];
const FIFTHS_LABELS  = ["C", "G", "D", "A", "E", "B/Cb", "F#/Gb", "C#/Db", "G#/Ab", "D#/Eb", "A#/Bb", "F"];
const FIFTHS_MINORS  = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "Bbm", "Fm", "Cm", "Gm", "Dm"];
const FIFTHS_MINOR_LABELS = ["Am", "Em", "Bm", "F#m", "C#m", "G#m/Abm", "D#m/Ebm", "A#m/Bbm", "E#m/Fm", "Cm", "Gm", "Dm"];
const FIFTHS_DIM     = ["Bdim", "F#dim", "C#dim", "G#dim", "D#dim", "A#dim", "Fdim", "Cdim", "Gdim", "Ddim", "Adim", "Edim"];
const FIFTHS_DIM_LABELS = ["B°", "F#°/Gb°", "C#°/Db°", "G#°/Ab°", "D#°/Eb°", "A#°/Bb°", "E#°/F°", "C°", "G°", "D°", "A°", "E°"];

// Fourths clockwise from C, using flat spellings first on the flat side.
const FOURTHS               = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "B", "E", "A", "D", "G"];
const FOURTHS_LABELS        = ["C", "F", "Bb/A#", "Eb/D#", "Ab/G#", "Db/C#", "Gb/F#", "Cb/B", "E", "A", "D", "G"];
const FOURTHS_MINORS        = ["Am", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm", "G#m", "C#m", "F#m", "Bm", "Em"];
const FOURTHS_MINOR_LABELS  = ["Am", "Dm", "Gm", "Cm", "Fm", "Bbm/A#m", "Ebm/D#m", "Abm/G#m", "C#m", "F#m", "Bm", "Em"];
const FOURTHS_DIM           = ["Bdim", "Edim", "Adim", "Ddim", "Gdim", "Cdim", "Fdim", "A#dim", "D#dim", "G#dim", "C#dim", "F#dim"];
const FOURTHS_DIM_LABELS    = ["B°", "E°", "A°", "D°", "G°", "C°", "F°/E#°", "Bb°/A#°", "Eb°/D#°", "Ab°/G#°", "Db°/C#°", "Gb°/F#°"];

function normalize(k: string): string {
  const isMinor = k.endsWith("m");
  const root = isMinor ? k.slice(0, -1) : k;
  const map: Record<string, string> = { Cb: "B", Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#", "E#": "F", "B#": "C" };
  const r = map[root] ?? root;
  return isMinor ? r + "m" : r;
}

function accidentalLabel(label: string) {
  return label.replace(/#/g, "♯").replace(/b/g, "♭");
}

// Degree colors — from tonic outward through the diatonic field.
const DEG_COLORS = {
  I:   "hsl(var(--primary))",
  ii:  "hsl(174 62% 47% / 0.65)",
  iii: "hsl(142 55% 45% / 0.60)",
  IV:  "hsl(217 91% 60% / 0.65)",
  V:   "hsl(0 72% 51% / 0.65)",
  vi:  "hsl(280 60% 55% / 0.65)",
  vii: "hsl(43 96% 56% / 0.75)",
} as const;

export function HarmonicCircle({
  currentKey,
  onSelectKey,
  className,
}: {
  currentKey: string;
  onSelectKey: (key: string) => void;
  className?: string;
}) {
  const [mode, setMode] = useState<"fifths" | "fourths">("fifths");

  const majors      = mode === "fifths" ? FIFTHS         : FOURTHS;
  const majorLabels = mode === "fifths" ? FIFTHS_LABELS  : FOURTHS_LABELS;
  const minors      = mode === "fifths" ? FIFTHS_MINORS  : FOURTHS_MINORS;
  const minorLabels = mode === "fifths" ? FIFTHS_MINOR_LABELS : FOURTHS_MINOR_LABELS;
  const dims        = mode === "fifths" ? FIFTHS_DIM     : FOURTHS_DIM;
  const dimLabels   = mode === "fifths" ? FIFTHS_DIM_LABELS : FOURTHS_DIM_LABELS;

  const currentNorm = normalize(currentKey);
  const currentIsMinor = currentNorm.endsWith("m");
  const rawIdx = currentIsMinor
    ? minors.findIndex((k) => normalize(k) === currentNorm)
    : majors.findIndex((k) => normalize(k) === currentNorm);
  const idx = Math.max(0, rawIdx);
  // Diatonic positions relative to major tonic (works for both cycles by
  // using +1/-1 in fifths and inverted for fourths).
  const step = mode === "fifths" ? 1 : -1;
  const IV_i  = (idx - step + 12) % 12;
  const V_i   = (idx + step + 12) % 12;
  const I_i   = idx;
  // Visual layout (harmonic wheel):
  //   iii sits at the same angular position as I (central/superior),
  //   vi  sits at the same angular position as V (superior externa).
  // Example (tom G): iii = Bm, vi = Em.
  const iii_i = idx;
  const vi_i  = (idx + step + 12) % 12;
  const ii_i  = (idx - step + 12) % 12;   // same angular pos as IV
  const vii_i = idx;

  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  // Rings (outer → inner): DIMINISHED, MINORS, MAJORS
  const rOuter = 170;
  const rMid1  = 128; // dim / minor boundary
  const rMid2  = 92;  // minor / major boundary
  const rInner = 58;  // major inner edge
  const rCenter = 40;

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

  const colorFor = (i: number, ring: "M" | "m" | "d") => {
    if (ring === "M") {
      if (i === I_i)  return DEG_COLORS.I;
      if (i === IV_i) return DEG_COLORS.IV;
      if (i === V_i)  return DEG_COLORS.V;
      return "hsl(var(--muted) / 0.75)";
    }
    if (ring === "m") {
      if (i === vi_i)  return DEG_COLORS.vi;
      if (i === ii_i)  return DEG_COLORS.ii;
      if (i === iii_i) return DEG_COLORS.iii;
      return "hsl(var(--muted) / 0.5)";
    }
    if (i === vii_i) return DEG_COLORS.vii;
    return "hsl(var(--muted) / 0.3)";
  };

  const renderRing = (
    r1: number,
    r2: number,
    labels: string[],
    chords: string[],
    ring: "M" | "m" | "d",
    fontSize: number,
    weight: number,
    keyPrefix: string,
    targetKeys = chords,
  ) =>
    segments.map((s, i) => {
      const midR = (r1 + r2) / 2;
      const tx = cx + midR * Math.cos(s.midA);
      const ty = cy + midR * Math.sin(s.midA);
      const labelParts = labels[i].split("/").map(accidentalLabel);
      const labelFontSize = labelParts.length > 1 ? Math.max(9, fontSize - 2) : fontSize;
      return (
        <g key={`${keyPrefix}${i}`} className="cursor-pointer" onClick={() => onSelectKey(targetKeys[i])}>
          <path
            d={arc(r1, r2, s.a0, s.a1)}
            fill={colorFor(i, ring)}
            stroke="hsl(var(--border))"
            strokeWidth={1}
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
            {labelParts.length === 1 ? (
              labelParts[0]
            ) : (
              labelParts.map((part, partIndex) => (
                <tspan key={part} x={tx} dy={partIndex === 0 ? "-0.38em" : "1.05em"}>
                  {part}
                </tspan>
              ))
            )}
          </text>
        </g>
      );
    });

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
        <button
          onClick={() => setMode("fifths")}
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
            mode === "fifths" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Ciclo das Quintas
        </button>
        <button
          onClick={() => setMode("fourths")}
          className={cn(
            "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
            mode === "fourths" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Ciclo das Quartas
        </button>
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        {/* Outer ring: DIMINISHED (vii°) */}
        {renderRing(rMid1, rOuter, dimLabels, dims, "d", 11, 700, "d", majors)}
        {/* Middle ring: MINORS */}
        {renderRing(rMid2, rMid1, minorLabels, minors, "m", 12, 600, "m")}
        {/* Inner ring: MAJORS */}
        {renderRing(rInner, rMid2, majorLabels, majors, "M", 13, 700, "M")}

        {/* Center */}
        <circle cx={cx} cy={cy} r={rCenter} fill="hsl(var(--surface))" stroke="hsl(var(--border))" />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground select-none"
          fontSize={9}
          fontWeight={600}
        >
          TOM
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground select-none"
          fontSize={16}
          fontWeight={800}
        >
          {currentKey}
        </text>
      </svg>

      <div className="grid w-full grid-cols-2 gap-1.5 text-[11px]">
        <Legend color={DEG_COLORS.I}   label="I (Tônica)" />
        <Legend color={DEG_COLORS.ii}  label="ii (Supertônica)" />
        <Legend color={DEG_COLORS.iii} label="iii (Mediante)" />
        <Legend color={DEG_COLORS.IV}  label="IV (Subdom.)" />
        <Legend color={DEG_COLORS.V}   label="V (Dominante)" />
        <Legend color={DEG_COLORS.vi}  label="vi (Rel. menor)" />
        <Legend color={DEG_COLORS.vii} label="vii° (Diminuto)" />
      </div>

      <p className="text-center text-[11px] leading-snug text-muted-foreground">
        Clique em qualquer acorde para definir como Tom Atual.
        {" "}
        {mode === "fifths"
          ? "Sentido horário adiciona sustenidos (♯)."
          : "Sentido horário adiciona bemóis (♭)."}
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-sm border border-border" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
