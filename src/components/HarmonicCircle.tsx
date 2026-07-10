import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// Fifths order (clockwise from C).
const FIFTHS = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"];
// Enharmonic display labels for fifths.
const FIFTHS_LABELS = ["C", "G", "D", "A", "E", "B", "F#/Gb", "Db", "Ab", "Eb", "Bb", "F"];
// Relative minors (a minor 3rd below the major = +9 semitones from major root pos).
const FIFTHS_MINORS = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m", "Fm", "Cm", "Gm", "Dm"];
const FIFTHS_MINORS_LABELS = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "Ebm", "Bbm", "Fm", "Cm", "Gm", "Dm"];

// Fourths = reverse direction (clockwise = perfect 4th up).
const FOURTHS = [...FIFTHS].reverse();
const FOURTHS_LABELS = [...FIFTHS_LABELS].reverse();
const FOURTHS_MINORS = [...FIFTHS_MINORS].reverse();
const FOURTHS_MINORS_LABELS = [...FIFTHS_MINORS_LABELS].reverse();

function normalize(k: string): string {
  const isMinor = k.endsWith("m");
  const root = isMinor ? k.slice(0, -1) : k;
  const map: Record<string, string> = {
    Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
  };
  const r = map[root] ?? root;
  return isMinor ? r + "m" : r;
}

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

  const majors = mode === "fifths" ? FIFTHS : FOURTHS;
  const majorLabels = mode === "fifths" ? FIFTHS_LABELS : FOURTHS_LABELS;
  const minors = mode === "fifths" ? FIFTHS_MINORS : FOURTHS_MINORS;
  const minorLabels = mode === "fifths" ? FIFTHS_MINORS_LABELS : FOURTHS_MINORS_LABELS;

  const currentNorm = normalize(currentKey);
  const currentIsMinor = currentNorm.endsWith("m");
  const currentMajor = currentIsMinor
    ? majors[minors.indexOf(currentNorm)] ?? majors[0]
    : currentNorm;

  const idx = majors.indexOf(currentMajor);
  // In fifths: IV is one step CCW (-1), V is one step CW (+1), vi is same idx on minor ring.
  // In fourths: reversed — IV is +1, V is -1.
  const ivIdx = mode === "fifths" ? (idx + 11) % 12 : (idx + 1) % 12;
  const vIdx = mode === "fifths" ? (idx + 1) % 12 : (idx + 11) % 12;
  const viIdx = idx; // relative minor sits at same angular position

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 150;
  const rMid = 108;
  const rInner = 72;
  const rCenter = 40;

  const segments = useMemo(() => {
    const step = (2 * Math.PI) / 12;
    return Array.from({ length: 12 }, (_, i) => {
      // Position i at top, going clockwise.
      const a0 = -Math.PI / 2 + (i - 0.5) * step;
      const a1 = -Math.PI / 2 + (i + 0.5) * step;
      const midA = -Math.PI / 2 + i * step;
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

  const colorFor = (i: number, isMinor: boolean) => {
    if ((!isMinor && majors[i] === currentMajor && !currentIsMinor) ||
        (isMinor && minors[i] === currentNorm && currentIsMinor)) return "hsl(var(--primary))";
    if (i === ivIdx) return "hsl(217 91% 60% / 0.55)"; // IV subdominant
    if (i === vIdx) return "hsl(0 72% 51% / 0.55)";    // V dominant
    if (!isMinor && i === viIdx && !currentIsMinor) return "hsl(280 60% 55% / 0.35)"; // vi
    if (isMinor && i === viIdx && !currentIsMinor) return "hsl(280 60% 55% / 0.55)";
    return isMinor ? "hsl(var(--muted) / 0.4)" : "hsl(var(--muted) / 0.7)";
  };

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
        {/* Outer ring: majors */}
        {segments.map((s, i) => {
          const label = majorLabels[i];
          const chord = majors[i];
          const midR = (rMid + rOuter) / 2;
          const tx = cx + midR * Math.cos(s.midA);
          const ty = cy + midR * Math.sin(s.midA);
          return (
            <g key={`M${i}`} className="cursor-pointer" onClick={() => onSelectKey(chord)}>
              <path
                d={arc(rMid, rOuter, s.a0, s.a1)}
                fill={colorFor(i, false)}
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-foreground pointer-events-none select-none"
                fontSize={13}
                fontWeight={700}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Inner ring: relative minors */}
        {segments.map((s, i) => {
          const label = minorLabels[i];
          const chord = minors[i];
          const midR = (rInner + rMid) / 2;
          const tx = cx + midR * Math.cos(s.midA);
          const ty = cy + midR * Math.sin(s.midA);
          return (
            <g key={`m${i}`} className="cursor-pointer" onClick={() => onSelectKey(chord)}>
              <path
                d={arc(rInner, rMid, s.a0, s.a1)}
                fill={colorFor(i, true)}
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-foreground pointer-events-none select-none"
                fontSize={11}
                fontWeight={600}
              >
                {label}
              </text>
            </g>
          );
        })}

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

      <div className="grid w-full grid-cols-3 gap-2 text-[11px]">
        <Legend color="hsl(var(--primary))" label="I (Tônica)" />
        <Legend color="hsl(217 91% 60% / 0.55)" label={mode === "fifths" ? "IV (Subdom.)" : "IV (Subdom.)"} />
        <Legend color="hsl(0 72% 51% / 0.55)" label="V (Dominante)" />
        <Legend color="hsl(280 60% 55% / 0.55)" label="vi (rel. menor)" />
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
