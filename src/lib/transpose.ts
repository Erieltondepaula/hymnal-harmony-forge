// Chord transposition engine
// Supports: C, C#, Db, m, 7, maj7, m7, 9, add9, sus2, sus4, °, dim, aug, slash chords

const SHARP_KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const NOTE_INDEX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

// Root regex: capture accidental too
const ROOT_RE = /^([A-G])([#b])?/;

function useFlats(key: string): boolean {
  // Flat-preferring keys
  return ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(key.replace("m", ""));
}

function transposeNote(note: string, semitones: number, preferFlats: boolean): string {
  const idx = NOTE_INDEX[note];
  if (idx === undefined) return note;
  const newIdx = (((idx + semitones) % 12) + 12) % 12;
  return (preferFlats ? FLAT_KEYS : SHARP_KEYS)[newIdx];
}

export function transposeChord(chord: string, fromKey: string, toKey: string): string {
  if (!chord || fromKey === toKey) return chord;
  const fromRoot = normalizeKey(fromKey);
  const toRoot = normalizeKey(toKey);
  const fromIdx = NOTE_INDEX[fromRoot];
  const toIdx = NOTE_INDEX[toRoot];
  if (fromIdx === undefined || toIdx === undefined) return chord;
  const semitones = toIdx - fromIdx;
  const preferFlats = useFlats(toKey);

  // Handle slash chord
  const [main, bass] = chord.split("/");
  const newMain = transposePart(main, semitones, preferFlats);
  if (bass !== undefined) {
    const newBass = transposePart(bass, semitones, preferFlats);
    return `${newMain}/${newBass}`;
  }
  return newMain;
}

function transposePart(part: string, semitones: number, preferFlats: boolean): string {
  const m = part.match(ROOT_RE);
  if (!m) return part;
  const root = (m[1] + (m[2] ?? "")) as string;
  const rest = part.slice(root.length);
  const newRoot = transposeNote(root, semitones, preferFlats);
  return newRoot + rest;
}

function normalizeKey(key: string): string {
  // Strip trailing 'm' for minor keys — same root note
  return key.replace(/m$/, "").trim();
}

export function transposeAll<T extends { chords: string[] }>(
  blocks: T[],
  fromKey: string,
  toKey: string,
): T[] {
  return blocks.map((b) => ({
    ...b,
    chords: b.chords.map((c) => transposeChord(c, fromKey, toKey)),
  }));
}
