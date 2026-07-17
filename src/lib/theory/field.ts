// Diatonic harmonic field — derived dynamically from the scale, not tables.
import { mod12, noteToPc } from "./chromatic";
import { buildScale, ScaleMode, Notation } from "./scales";

export type TriadQuality = "maj" | "min" | "dim" | "aug";

export type FieldEntry = {
  degree: number;              // 1..7
  degreeRoman: string;         // "I", "ii", "iii°", "III+", ...
  root: string;                // note name using scale spelling
  quality: TriadQuality;
  chord: string;               // e.g. "Cm", "F#dim", "G+"
  functionName: string;        // "Tônica", "Dominante", ...
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

function romanFor(degree: number, q: TriadQuality): string {
  const base = ROMAN[degree - 1];
  if (q === "maj") return base;
  if (q === "aug") return base + "+";
  if (q === "min") return base.toLowerCase();
  return base.toLowerCase() + "°";
}

function chordFor(root: string, q: TriadQuality): string {
  if (q === "maj") return root;
  if (q === "min") return root + "m";
  if (q === "dim") return root + "°";
  return root + "+";
}

const FUNC_MAJOR = ["Tônica", "Supertônica", "Mediante", "Subdominante", "Dominante", "Submediante", "Sensível"];
const FUNC_MINOR = ["Tônica", "Supertônica", "Mediante", "Subdominante", "Dominante", "Submediante", "Subtônica"];

function functionName(degree: number, mode: ScaleMode, q: TriadQuality): string {
  const base = mode === "major" ? FUNC_MAJOR : FUNC_MINOR;
  // In harmonic minor, VII is a leading tone (Sensível) when raised (dim).
  if (mode === "harmonic" && degree === 7 && q === "dim") return "Sensível";
  return base[degree - 1];
}

// Compute the triad quality from stacked thirds (1-3-5) using pitch classes.
function qualityFromPcs(root: number, third: number, fifth: number): TriadQuality {
  const t = mod12(third - root);
  const f = mod12(fifth - root);
  if (t === 4 && f === 7) return "maj";
  if (t === 3 && f === 7) return "min";
  if (t === 3 && f === 6) return "dim";
  if (t === 4 && f === 8) return "aug";
  // fallback — non-tertian triads (rare in melodic minor field). Approximate:
  if (t <= 3) return f === 6 ? "dim" : "min";
  return f === 8 ? "aug" : "maj";
}

export function harmonicField(tonic: string, mode: ScaleMode, notation: Notation = "auto"): FieldEntry[] {
  const scale = buildScale(tonic, mode, notation);
  if (scale.length !== 7) return [];
  const pcs = scale.map((n) => noteToPc(n)!);
  return scale.map((root, i) => {
    const rPc = pcs[i];
    const tPc = pcs[(i + 2) % 7];
    const fPc = pcs[(i + 4) % 7];
    const q = qualityFromPcs(rPc, tPc, fPc);
    const degree = i + 1;
    return {
      degree,
      degreeRoman: romanFor(degree, q),
      root,
      quality: q,
      chord: chordFor(root, q),
      functionName: functionName(degree, mode, q),
    };
  });
}
