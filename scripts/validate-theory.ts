// Validation harness for src/lib/theory/*. Run with: bun run scripts/validate-theory.ts
import {
  buildScale, harmonicField, keySignature, relativeKey, noteToPc,
} from "../src/lib/theory";

let passed = 0, failed = 0;
const fail: string[] = [];
function eq<T>(label: string, got: T, want: T) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { passed++; }
  else { failed++; fail.push(`✗ ${label}\n    got:  ${g}\n    want: ${w}`); }
}

// ---- Chromatic PCs
for (const [n, p] of [["C",0],["C#",1],["Db",1],["D",2],["D#",3],["Eb",3],
  ["E",4],["F",5],["F#",6],["Gb",6],["G",7],["G#",8],["Ab",8],["A",9],
  ["A#",10],["Bb",10],["B",11]] as const) eq(`pc(${n})`, noteToPc(n as string), p as number);

// ---- Major scales (letter-consecutive spellings)
eq("major C",  buildScale("C","major"),  ["C","D","E","F","G","A","B"]);
eq("major G",  buildScale("G","major"),  ["G","A","B","C","D","E","F#"]);
eq("major D",  buildScale("D","major"),  ["D","E","F#","G","A","B","C#"]);
eq("major A",  buildScale("A","major"),  ["A","B","C#","D","E","F#","G#"]);
eq("major E",  buildScale("E","major"),  ["E","F#","G#","A","B","C#","D#"]);
eq("major B",  buildScale("B","major"),  ["B","C#","D#","E","F#","G#","A#"]);
eq("major F#", buildScale("F#","major"), ["F#","G#","A#","B","C#","D#","E#"]);
eq("major F",  buildScale("F","major"),  ["F","G","A","Bb","C","D","E"]);
eq("major Bb", buildScale("Bb","major"), ["Bb","C","D","Eb","F","G","A"]);
eq("major Eb", buildScale("Eb","major"), ["Eb","F","G","Ab","Bb","C","D"]);
eq("major Ab", buildScale("Ab","major"), ["Ab","Bb","C","Db","Eb","F","G"]);
eq("major Db", buildScale("Db","major"), ["Db","Eb","F","Gb","Ab","Bb","C"]);
eq("major Gb", buildScale("Gb","major"), ["Gb","Ab","Bb","Cb","Db","Eb","F"]);

// ---- Minor natural scales
eq("minor A",  buildScale("A","minor"),  ["A","B","C","D","E","F","G"]);
eq("minor E",  buildScale("E","minor"),  ["E","F#","G","A","B","C","D"]);
eq("minor D",  buildScale("D","minor"),  ["D","E","F","G","A","Bb","C"]);

// ---- Harmonic minor
eq("harm A",   buildScale("A","harmonic"),  ["A","B","C","D","E","F","G#"]);
eq("harm E",   buildScale("E","harmonic"),  ["E","F#","G","A","B","C","D#"]);

// ---- Melodic minor (ascending)
eq("melo A",   buildScale("A","melodic"),   ["A","B","C","D","E","F#","G#"]);

// ---- Harmonic fields
const qOf = (mode: any, tonic: string) => harmonicField(tonic, mode).map(f => f.degreeRoman);
eq("field C major",       qOf("major","C"),    ["I","ii","iii","IV","V","vi","vii°"]);
eq("field A minor nat",   qOf("minor","A"),    ["i","ii°","III","iv","v","VI","VII"]);
eq("field A harm minor",  qOf("harmonic","A"), ["i","ii°","III+","iv","V","VI","vii°"]);
eq("field A melo minor",  qOf("melodic","A"),  ["i","ii","III+","IV","V","vi°","vii°"]);

// ---- Field chord names for C major
eq("field C major chords",
  harmonicField("C","major").map(f => f.chord),
  ["C","Dm","Em","F","G","Am","B°"]);
eq("field G major chords",
  harmonicField("G","major").map(f => f.chord),
  ["G","Am","Bm","C","D","Em","F#°"]);

// ---- Key signatures
eq("sig C",  keySignature("C","major"),  0);
eq("sig G",  keySignature("G","major"),  1);
eq("sig F#", keySignature("F#","major"), 6);
eq("sig C#", keySignature("C#","major"), 7);
eq("sig F",  keySignature("F","major"),  -1);
eq("sig Gb", keySignature("Gb","major"), -6);
eq("sig A minor", keySignature("A","minor"), 0);
eq("sig E minor", keySignature("E","minor"), 1);
eq("sig D minor", keySignature("D","minor"), -1);

// ---- Relative keys
eq("rel C maj",  relativeKey("C","major"),  { tonic: "A",  mode: "minor" });
eq("rel G maj",  relativeKey("G","major"),  { tonic: "E",  mode: "minor" });
eq("rel F maj",  relativeKey("F","major"),  { tonic: "D",  mode: "minor" });
eq("rel A min",  relativeKey("A","minor"),  { tonic: "C",  mode: "major" });
eq("rel E min",  relativeKey("E","minor"),  { tonic: "G",  mode: "major" });

// ---- All 17 spelled tonics are clickable (buildScale returns 7 notes, all valid).
for (const t of ["C","C#","Db","D","D#","Eb","E","F","F#","Gb","G","G#","Ab","A","A#","Bb","B"]) {
  const s = buildScale(t, "major");
  eq(`major(${t}) length`, s.length, 7);
  // Ensure no mixed accidentals in "auto" mode: the scale should be entirely
  // sharps-or-natural OR flats-or-natural (never both # and b in the same scale).
  const hasSharp = s.some(n => n.includes("#"));
  const hasFlat  = s.some(n => n.includes("b"));
  eq(`major(${t}) no-mix`, hasSharp && hasFlat, false);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) { console.log("\nFailures:"); fail.forEach(f => console.log(f)); process.exit(1); }
