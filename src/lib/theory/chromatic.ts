// Chromatic scale foundation. All theory logic derives from pitch classes (PC 0..11).

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type Letter = (typeof LETTERS)[number];

// Natural letter -> pitch class.
export const LETTER_PC: Record<Letter, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

export const NOTE_TO_PC: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4, "E#": 5, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11, "B#": 0,
};

export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const FLAT_NAMES  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export function mod12(n: number): number { return ((n % 12) + 12) % 12; }

export function noteToPc(note: string): number | null {
  return NOTE_TO_PC[note] ?? null;
}

// Spell a PC using a specific letter — adjusts accidental (bb, b, natural, #, x)
// so the letter's natural PC + accidental = target PC.
const ACC_LABEL = ["bb", "b", "", "#", "x"] as const;
export function spellPcWithLetter(pc: number, letter: Letter): string {
  const natural = LETTER_PC[letter];
  let diff = mod12(pc - natural);
  if (diff > 6) diff -= 12; // signed -6..6
  // diff in [-2..2]: bb, b, natural, #, x
  if (diff < -2 || diff > 2) {
    // extreme (rare) — fall back to sharp spelling
    return SHARP_NAMES[pc];
  }
  const acc = ACC_LABEL[diff + 2];
  return letter + acc;
}

export function letterAfter(letter: Letter, steps: number): Letter {
  const i = LETTERS.indexOf(letter);
  return LETTERS[(i + steps + 700) % 7];
}

// Pretty accidentals for display.
export function pretty(name: string): string {
  return name.replace(/bb/g, "𝄫").replace(/x/g, "𝄪").replace(/#/g, "♯").replace(/b/g, "♭");
}

// Extract the root letter from a note string ("Bb" -> "B", "F#" -> "F").
export function rootLetter(note: string): Letter | null {
  const c = note[0]?.toUpperCase();
  return (LETTERS as readonly string[]).includes(c) ? (c as Letter) : null;
}
