// Harmonic-field (campo harmônico) engine.
// Maps chords to scale degrees (1–7) of a diatonic major field and back,
// so key changes preserve harmonic function instead of doing raw chromatic math.

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const NOTE_IDX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

// Intervals of the major scale (I ii iii IV V vi vii°).
const INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const DIA_QUALS: Array<"maj" | "m" | "dim"> = ["maj", "m", "m", "maj", "maj", "m", "dim"];

const FLAT_ROOTS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb"]);

function keyRoot(k: string) {
  return k.replace(/m$/, "").trim();
}

// For a minor key, use its relative major so degrees align with the same
// diatonic pool (Am ⇒ C, Em ⇒ G, ...).
function relativeMajor(k: string): string {
  const root = keyRoot(k);
  if (!k.endsWith("m")) return root;
  const idx = NOTE_IDX[root];
  if (idx == null) return root;
  const majIdx = (idx + 3) % 12;
  return FLAT_ROOTS.has(root) ? FLAT[majIdx] : SHARP[majIdx];
}

function noteAt(majorRoot: string, semitones: number): string {
  const base = NOTE_IDX[majorRoot];
  if (base == null) return majorRoot;
  const idx = (((base + semitones) % 12) + 12) % 12;
  return FLAT_ROOTS.has(majorRoot) ? FLAT[idx] : SHARP[idx];
}

export type ParsedChord = {
  root: string;
  basic: "maj" | "m" | "dim";
  ext: string; // extension after the basic quality (7, maj7, sus4, 9, add9, etc.)
  bass?: string;
};

export function parseChord(chord: string): ParsedChord | null {
  if (!chord) return null;
  const [main, bass] = chord.split("/");
  const rootMatch = main.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;
  const root = rootMatch[1];
  const rest = main.slice(root.length);
  let basic: ParsedChord["basic"] = "maj";
  let ext = rest;
  if (rest.startsWith("dim")) { basic = "dim"; ext = rest.slice(3); }
  else if (rest.startsWith("°")) { basic = "dim"; ext = rest.slice(1); }
  else if (rest.startsWith("m") && !rest.startsWith("maj") && !rest.startsWith("mM")) {
    basic = "m";
    ext = rest.slice(1);
  }
  return { root, basic, ext, bass };
}

export function chordToDegree(
  chord: string,
  key: string,
): { degree: number; ext: string; bass?: string } | null {
  const p = parseChord(chord);
  if (!p) return null;
  const major = relativeMajor(key);
  const majorIdx = NOTE_IDX[major];
  const rootIdx = NOTE_IDX[p.root];
  if (majorIdx == null || rootIdx == null) return null;
  const interval = (((rootIdx - majorIdx) % 12) + 12) % 12;
  const degIdx = INTERVALS.indexOf(interval);
  if (degIdx < 0) return null;
  if (DIA_QUALS[degIdx] !== p.basic) return null;
  return { degree: degIdx + 1, ext: p.ext, bass: p.bass };
}

export function degreeToChord(
  degree: number,
  ext: string,
  key: string,
  bassNote?: string,
): string {
  const major = relativeMajor(key);
  const iv = INTERVALS[degree - 1];
  const root = noteAt(major, iv);
  const q = DIA_QUALS[degree - 1];
  const qStr = q === "maj" ? "" : q === "m" ? "m" : "dim";
  let chord = root + qStr + ext;
  if (bassNote) chord += "/" + bassNote;
  return chord;
}

// Chromatic fallback used when a chord isn't diatonic in fromKey.
function chromaticTranspose(chord: string, fromKey: string, toKey: string): string {
  const [main, bass] = chord.split("/");
  const fromRoot = relativeMajor(fromKey);
  const toRoot = relativeMajor(toKey);
  const fromIdx = NOTE_IDX[fromRoot];
  const toIdx = NOTE_IDX[toRoot];
  if (fromIdx == null || toIdx == null) return chord;
  const semitones = toIdx - fromIdx;
  const preferFlats = FLAT_ROOTS.has(toRoot);
  const shift = (part: string) => {
    const m = part.match(/^([A-G][#b]?)/);
    if (!m) return part;
    const idx = NOTE_IDX[m[1]];
    if (idx == null) return part;
    const newIdx = (((idx + semitones) % 12) + 12) % 12;
    const newRoot = (preferFlats ? FLAT : SHARP)[newIdx];
    return newRoot + part.slice(m[1].length);
  };
  const out = shift(main);
  return bass !== undefined ? `${out}/${shift(bass)}` : out;
}

export function smartTransposeChord(chord: string, fromKey: string, toKey: string): string {
  if (!chord || fromKey === toKey) return chord;
  const [main, bass] = chord.split("/");
  const deg = chordToDegree(main, fromKey);
  if (!deg) return chromaticTranspose(chord, fromKey, toKey);

  // Map bass note diatonically by preserving its interval relative to the key.
  let newBass: string | undefined;
  if (bass) {
    const bassMatch = bass.match(/^([A-G][#b]?)(.*)$/);
    if (bassMatch) {
      const fromMajor = relativeMajor(fromKey);
      const toMajor = relativeMajor(toKey);
      const bIdx = NOTE_IDX[bassMatch[1]];
      const fIdx = NOTE_IDX[fromMajor];
      const tIdx = NOTE_IDX[toMajor];
      if (bIdx != null && fIdx != null && tIdx != null) {
        const iv = (((bIdx - fIdx) % 12) + 12) % 12;
        const newIdx = (tIdx + iv) % 12;
        const preferFlats = FLAT_ROOTS.has(relativeMajor(toKey));
        newBass = (preferFlats ? FLAT : SHARP)[newIdx] + bassMatch[2];
      } else {
        newBass = bass;
      }
    } else {
      newBass = bass;
    }
  }

  return degreeToChord(deg.degree, deg.ext, toKey, newBass);
}

export function smartTransposeAll<T extends { chords: string[] }>(
  blocks: T[],
  fromKey: string,
  toKey: string,
): T[] {
  return blocks.map((b) => ({
    ...b,
    chords: b.chords.map((c) => smartTransposeChord(c, fromKey, toKey)),
  }));
}

// Returns the seven diatonic chords for a key, in order I ii iii IV V vi vii°.
export function diatonicField(key: string): string[] {
  return [1, 2, 3, 4, 5, 6, 7].map((d) => degreeToChord(d, "", key));
}

// Signed semitone distance between two keys, normalized to [-6, 6].
export function keyInterval(from: string, to: string): number {
  const fRoot = relativeMajor(from);
  const tRoot = relativeMajor(to);
  const fIdx = NOTE_IDX[fRoot];
  const tIdx = NOTE_IDX[tRoot];
  if (fIdx == null || tIdx == null) return 0;
  let diff = tIdx - fIdx;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return diff;
}

// Human-friendly label using tons + semitons (music convention).
// 1 tom = 2 semitons. Examples: 1 semitom → "½ tom", 5 semitons → "2½ tons".
export function formatKeyInterval(from: string, to: string): string {
  const diff = keyInterval(from, to);
  if (diff === 0) return "";
  const sign = diff > 0 ? "+" : "-";
  const abs = Math.abs(diff);
  const whole = Math.floor(abs / 2);
  const half = abs % 2 === 1;
  let label: string;
  if (whole === 0) label = "½ tom";
  else if (half) label = `${whole}½ tons`;
  else label = `${whole} ${whole === 1 ? "tom" : "tons"}`;
  return `${sign}${label}`;
}

