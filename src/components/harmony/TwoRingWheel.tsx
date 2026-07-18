import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { pretty } from "@/lib/theory";

export type WheelSlot = {
  outer: string;   // e.g. "C" or "F♯/G♭"
  inner: string;   // e.g. "Am"
  outerValue: string; // canonical key value to emit on click (e.g. "C" or "F#")
  innerValue: string; // e.g. "Am"
};

type Props = {
  slots: WheelSlot[];              // exactly 12, starting at top going clockwise
  activeOuter?: string;            // matches outerValue
  activeInner?: string;            // matches innerValue
  onSelect: (key: string) => void;
  size?: number;
  outerLabel?: string;
  innerLabel?: string;
};

export function TwoRingWheel({
  slots, activeOuter, activeInner, onSelect,
  size = 340, outerLabel = "Maiores", innerLabel = "menores",
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.47;
  const rMid   = size * 0.32;
  const rInner = size * 0.17;

  const segs = useMemo(() => {
    const s = (2 * Math.PI) / 12;
    return slots.map((_, i) => {
      const a0 = -Math.PI / 2 + (i - 0.5) * s;
      const a1 = -Math.PI / 2 + (i + 0.5) * s;
      const mid = -Math.PI / 2 + i * s;
      return { a0, a1, mid };
    });
  }, [slots]);

  const arc = (r1: number, r2: number, a0: number, a1: number) => {
    const x0 = cx + r2 * Math.cos(a0), y0 = cy + r2 * Math.sin(a0);
    const x1 = cx + r2 * Math.cos(a1), y1 = cy + r2 * Math.sin(a1);
    const x2 = cx + r1 * Math.cos(a1), y2 = cy + r1 * Math.sin(a1);
    const x3 = cx + r1 * Math.cos(a0), y3 = cy + r1 * Math.sin(a0);
    return `M ${x0} ${y0} A ${r2} ${r2} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${r1} ${r1} 0 0 0 ${x3} ${y3} Z`;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
      {/* outer ring */}
      {segs.map((s, i) => {
        const slot = slots[i];
        const active = activeOuter === slot.outerValue;
        const tx = cx + ((rMid + rOuter) / 2) * Math.cos(s.mid);
        const ty = cy + ((rMid + rOuter) / 2) * Math.sin(s.mid);
        return (
          <g key={`o${i}`} className="cursor-pointer" onClick={() => onSelect(slot.outerValue)}>
            <path
              d={arc(rMid, rOuter, s.a0, s.a1)}
              fill={active ? "hsl(var(--primary))" : "hsl(var(--muted) / 0.6)"}
              stroke="hsl(var(--border))"
              strokeWidth={active ? 2 : 1}
            />
            <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                  className={cn("pointer-events-none select-none", active ? "fill-primary-foreground" : "fill-foreground")}
                  fontSize={12} fontWeight={700}>
              {slot.outer}
            </text>
          </g>
        );
      })}
      {/* inner ring */}
      {segs.map((s, i) => {
        const slot = slots[i];
        const active = activeInner === slot.innerValue;
        const tx = cx + ((rInner + rMid) / 2) * Math.cos(s.mid);
        const ty = cy + ((rInner + rMid) / 2) * Math.sin(s.mid);
        return (
          <g key={`i${i}`} className="cursor-pointer" onClick={() => onSelect(slot.innerValue)}>
            <path
              d={arc(rInner, rMid, s.a0, s.a1)}
              fill={active ? "hsl(var(--primary) / 0.85)" : "hsl(var(--muted) / 0.35)"}
              stroke="hsl(var(--border))"
              strokeWidth={active ? 2 : 1}
            />
            <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                  className={cn("pointer-events-none select-none", active ? "fill-primary-foreground" : "fill-foreground")}
                  fontSize={11} fontWeight={600}>
              {slot.inner}
            </text>
          </g>
        );
      })}
      {/* center */}
      <circle cx={cx} cy={cy} r={rInner} fill="hsl(var(--surface))" stroke="hsl(var(--border))" />
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-muted-foreground select-none"
            fontSize={9} fontWeight={700}>{outerLabel.toUpperCase()}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" className="fill-muted-foreground select-none"
            fontSize={9} fontWeight={600}>{innerLabel}</text>
    </svg>
  );
}

// Helper: canonical fifths order starting at C (12 o'clock), clockwise.
// Uses conventional spellings — enharmonic zones show both.
export const FIFTHS_MAJORS: Array<{ display: string; value: string }> = [
  { display: "C",        value: "C"  },
  { display: "G",        value: "G"  },
  { display: "D",        value: "D"  },
  { display: "A",        value: "A"  },
  { display: "E",        value: "E"  },
  { display: "B",        value: "B"  },
  { display: "F♯ / G♭",  value: "F#" },
  { display: "D♭",       value: "Db" },
  { display: "A♭",       value: "Ab" },
  { display: "E♭",       value: "Eb" },
  { display: "B♭",       value: "Bb" },
  { display: "F",        value: "F"  },
];

export const FIFTHS_MINORS: Array<{ display: string; value: string }> = [
  { display: "Am",       value: "Am"  },
  { display: "Em",       value: "Em"  },
  { display: "Bm",       value: "Bm"  },
  { display: "F♯m",      value: "F#m" },
  { display: "C♯m",      value: "C#m" },
  { display: "G♯m",      value: "G#m" },
  { display: "D♯m / E♭m",value: "D#m" },
  { display: "B♭m",      value: "Bbm" },
  { display: "Fm",       value: "Fm"  },
  { display: "Cm",       value: "Cm"  },
  { display: "Gm",       value: "Gm"  },
  { display: "Dm",       value: "Dm"  },
];

// Pretty helper wrapper (in case caller wants unicode).
export const P = pretty;
