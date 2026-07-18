import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildScale, harmonicField, keySignature, armaduraLabel, relativeKey,
  MODE_LABEL, ScaleMode, Notation, pretty, noteToPc, SHARP_NAMES, FLAT_NAMES,
} from "@/lib/theory";

type Props = { currentKey: string; onSelectKey: (k: string) => void };

const DEG_COLORS = [
  "hsl(var(--primary))",
  "hsl(174 62% 47%)",
  "hsl(142 55% 45%)",
  "hsl(217 91% 60%)",
  "hsl(0 72% 51%)",
  "hsl(280 60% 55%)",
  "hsl(43 96% 56%)",
];

function parseKey(k: string): { tonicName: string; mode: ScaleMode } {
  const isMinor = k.endsWith("m") && !k.endsWith("dim");
  return { tonicName: isMinor ? k.slice(0, -1) : k, mode: isMinor ? "minor" : "major" };
}

/**
 * Campo Harmônico — seletor de modo/notação, escala, armadura, relativa e
 * os 7 graus com função tonal. Isolado do círculo.
 */
export function HarmonicField({ currentKey, onSelectKey }: Props) {
  const parsed = parseKey(currentKey);
  const [mode, setMode] = useState<ScaleMode>(parsed.mode);
  const [notation, setNotation] = useState<Notation>("auto");

  // Re-spell tonic per notation preference.
  const tonicPc = noteToPc(parsed.tonicName) ?? 0;
  const tonic = useMemo(() => {
    const useFlats = notation === "flat" || (notation === "auto" && parsed.tonicName.includes("b"));
    return (useFlats ? FLAT_NAMES : SHARP_NAMES)[tonicPc];
  }, [tonicPc, notation, parsed.tonicName]);

  const scale = useMemo(() => buildScale(tonic, mode, notation), [tonic, mode, notation]);
  const field = useMemo(() => harmonicField(tonic, mode, notation), [tonic, mode, notation]);
  const sig = keySignature(tonic, mode);
  const rel = relativeKey(tonic, mode);
  const isMinor = mode !== "major";

  return (
    <div className="flex flex-col gap-3">
      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
          {(["major", "minor", "harmonic", "melodic"] as ScaleMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
          {(["auto", "sharp", "flat"] as Notation[]).map((n) => (
            <button key={n} onClick={() => setNotation(n)}
              className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                notation === n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {n === "auto" ? "Auto" : n === "sharp" ? "♯" : "♭"}
            </button>
          ))}
        </div>
      </div>

      {/* Meta */}
      <div className="rounded-xl border border-border bg-surface p-3 text-[12px]">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span><span className="text-muted-foreground">Tom:</span> <b>{pretty(tonic)}{isMinor ? "m" : ""}</b></span>
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
              <button key={i} onClick={() => onSelectKey(f.chord)}
                className="rounded-md border border-border bg-background px-1 py-1 hover:bg-muted transition-colors"
                title={f.functionName}>
                <div className="text-[10px] font-bold" style={{ color: DEG_COLORS[i] }}>{f.degreeRoman}</div>
                <div className="text-[12px] font-semibold">{pretty(f.chord)}</div>
              </button>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[9px] text-muted-foreground">
            {field.map((f, i) => (<div key={i}>{f.functionName}</div>))}
          </div>
        </div>
      </div>
    </div>
  );
}
