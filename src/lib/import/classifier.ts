// Normalize block labels to the canonical vocabulary and, when the imported
// cifra has no section markers, infer roles from structure.

import type { ParsedCifraBlock } from "@/lib/cifra-parser";

const CANON = {
  INTRO: "INTRODUÇÃO",
  VERSO: "VERSO",
  PARTE_1: "PARTE 1",
  PARTE_2: "PARTE 2",
  PARTE_3: "PARTE 3",
  PRE_REFRAO: "PRÉ-REFRÃO",
  REFRAO: "REFRÃO",
  PONTE: "PONTE",
  SOLO: "SOLO",
  INSTRUMENTAL: "INSTRUMENTAL",
  FINAL: "FINALIZAÇÃO",
  VAMP: "VAMP",
  INTERLUDIO: "INTERLÚDIO",
} as const;

function strip(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Normalize an existing (possibly foreign) section label. Returns null when nothing matches. */
export function normalizeLabel(raw: string): string | null {
  const s = strip(raw);
  if (!s) return null;
  if (/^(intro|introducao|entrada)/.test(s)) return CANON.INTRO;
  if (/pre[\s-]?ref|pre[\s-]?chorus|pre[\s-]?coro/.test(s)) return CANON.PRE_REFRAO;
  if (/^(ref|refrao|chorus|coro)\b/.test(s)) return CANON.REFRAO;
  if (/(ponte|bridge)/.test(s)) return CANON.PONTE;
  if (/^solo\b/.test(s)) return CANON.SOLO;
  if (/(instrumental)/.test(s)) return CANON.INSTRUMENTAL;
  if (/(interludio|interlude)/.test(s)) return CANON.INTERLUDIO;
  if (/^(final|fim|outro|finalizacao)/.test(s)) return CANON.FINAL;
  if (/^vamp\b/.test(s)) return CANON.VAMP;
  if (/parte\s*1|primeir|verso\s*1|verse\s*1/.test(s)) return CANON.PARTE_1;
  if (/parte\s*2|segund|verso\s*2|verse\s*2/.test(s)) return CANON.PARTE_2;
  if (/parte\s*3|terceir|verso\s*3|verse\s*3/.test(s)) return CANON.PARTE_3;
  if (/^parte\s*\d+/.test(s)) return raw.trim().toUpperCase();
  if (/(verso|verse|estrofe)/.test(s)) return CANON.VERSO;
  return null;
}

/**
 * Given the parsed blocks, ensure each has a canonical `type`. If the
 * imported cifra had no section markers (all types look like "PARTE N"
 * or empty), infer roles from repetition + position.
 */
export function classifyBlocks(blocks: ParsedCifraBlock[]): ParsedCifraBlock[] {
  if (!blocks.length) return blocks;

  // 1) Normalize any labels the parser already assigned.
  let out = blocks.map((b) => {
    const canon = normalizeLabel(b.type) ?? b.type.toUpperCase();
    return { ...b, type: canon };
  });

  // 2) Detect "no markers" case: every block is a generic "PARTE N".
  const generic = out.every((b) => /^PARTE\s*\d*$/.test(b.type));
  if (!generic) return out;

  // 3) Infer. Find a repeating block (same normalized chord signature) —
  //    that's likely the Refrão. Others become Verso / Intro / Final based
  //    on presence of lyric and position.
  const sigs = out.map((b) =>
    b.chords.map((c) => c.replace(/\s+/g, "").toUpperCase()).join(","),
  );
  const counts = new Map<string, number>();
  for (const s of sigs) counts.set(s, (counts.get(s) ?? 0) + 1);
  const repeatingSig = [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, z) => z[1] - a[1])[0]?.[0];

  let verseIdx = 0;
  out = out.map((b, i) => {
    const sig = sigs[i];
    const hasLyric = Boolean(b.lyric && b.lyric.trim());
    if (i === 0 && !hasLyric) return { ...b, type: CANON.INTRO };
    if (i === out.length - 1 && !hasLyric) return { ...b, type: CANON.FINAL };
    if (repeatingSig && sig === repeatingSig) return { ...b, type: CANON.REFRAO };
    if (!hasLyric) return { ...b, type: CANON.SOLO };
    verseIdx += 1;
    if (verseIdx === 1) return { ...b, type: CANON.PARTE_1 };
    if (verseIdx === 2) return { ...b, type: CANON.PARTE_2 };
    if (verseIdx === 3) return { ...b, type: CANON.PARTE_3 };
    return { ...b, type: `PARTE ${verseIdx}` };
  });

  return out;
}
