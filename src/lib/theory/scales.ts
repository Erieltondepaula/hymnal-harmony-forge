// Scale formulas — everything derives from these. No hard-coded scale tables.
import {
  Letter, LETTER_PC, letterAfter, mod12, noteToPc, rootLetter, spellPcWithLetter,
  SHARP_NAMES, FLAT_NAMES,
} from "./chromatic";

export type ScaleMode = "major" | "minor" | "harmonic" | "melodic";

export const MODE_LABEL: Record<ScaleMode, string> = {
  major: "Maior Natural",
  minor: "Menor Natural",
  harmonic: "Menor Harmônica",
  melodic: "Menor Melódica",
};

// Whole-step / half-step formulas as semitone deltas between consecutive degrees.
export const SCALE_STEPS: Record<ScaleMode, number[]> = {
  major:    [2, 2, 1, 2, 2, 2, 1],
  minor:    [2, 1, 2, 2, 1, 2, 2],
  harmonic: [2, 1, 2, 2, 1, 3, 1],
  melodic:  [2, 1, 2, 2, 2, 2, 1],
};

export type Notation = "auto" | "sharp" | "flat";

// Keys traditionally written with flats when in Auto mode.
const FLAT_MAJOR_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"]);
const FLAT_MINOR_KEYS = new Set(["D", "G", "C", "F", "Bb", "Eb"]); // rel. minors of flat majors

function preferFlats(tonic: string, mode: ScaleMode, notation: Notation): boolean {
  if (notation === "flat") return true;
  if (notation === "sharp") return false;
  // Auto: derive from the tonic name.
  if (tonic.includes("b")) return true;
  if (tonic.includes("#")) return false;
  // Natural tonic — consult convention list.
  if (mode === "major") return FLAT_MAJOR_KEYS.has(tonic);
  return FLAT_MINOR_KEYS.has(tonic);
}

// Build the 7 scale notes with letter-consecutive spelling (no mixed accidentals).
export function buildScale(tonic: string, mode: ScaleMode, notation: Notation = "auto"): string[] {
  const startLetter = rootLetter(tonic);
  const startPc = noteToPc(tonic);
  if (startLetter == null || startPc == null) return [];
  const steps = SCALE_STEPS[mode];

  // Try letter-consecutive spelling first (the theoretically correct approach).
  const notes: string[] = [];
  let pc = startPc;
  for (let i = 0; i < 7; i++) {
    const letter: Letter = letterAfter(startLetter, i);
    notes.push(spellPcWithLetter(pc, letter));
    pc = mod12(pc + steps[i]);
  }

  // If Notation forces sharp/flat and letter-spelling produced the "wrong" side,
  // re-spell using the chromatic name preference. Auto keeps letter-consecutive
  // (which is what real music notation uses — never mixes accidentals).
  if (notation !== "auto") {
    const useFlats = preferFlats(tonic, mode, notation);
    return notes.map((n) => {
      const p = noteToPc(n);
      if (p == null) return n;
      return (useFlats ? FLAT_NAMES : SHARP_NAMES)[p];
    });
  }
  return notes;
}

// Relative key (major <-> its natural minor).
export function relativeKey(tonic: string, mode: ScaleMode): { tonic: string; mode: ScaleMode } | null {
  const pc = noteToPc(tonic);
  if (pc == null) return null;
  if (mode === "major") {
    const letter = rootLetter(tonic);
    if (!letter) return null;
    const relLetter = letterAfter(letter, 5); // sixth degree letter
    const relTonic = spellPcWithLetter(mod12(pc + 9), relLetter);
    return { tonic: relTonic, mode: "minor" };
  }
  if (mode === "minor") {
    const letter = rootLetter(tonic);
    if (!letter) return null;
    const relLetter = letterAfter(letter, 2);
    const relTonic = spellPcWithLetter(mod12(pc + 3), relLetter);
    return { tonic: relTonic, mode: "major" };
  }
  return null;
}

// Key signature (# or b count) for a major/minor key.
const MAJOR_SIG: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7,
  F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};
export function keySignature(tonic: string, mode: ScaleMode): number {
  if (mode === "major") return MAJOR_SIG[tonic] ?? 0;
  // Minor: use relative major's signature.
  const rel = relativeKey(tonic, "minor");
  return rel ? MAJOR_SIG[rel.tonic] ?? 0 : 0;
}

export function armaduraLabel(sig: number): string {
  if (sig === 0) return "sem acidentes";
  if (sig > 0) return `${sig} ♯`;
  return `${Math.abs(sig)} ♭`;
}
