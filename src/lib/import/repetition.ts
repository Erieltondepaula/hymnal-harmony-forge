// Detect repeated / near-repeated blocks and assign a structureId to each.
//
// Similarity mixes multiple features so that structurally identical blocks
// (same chord progression, same shape) are recognized even when the lyric
// differs — that flags a *variação estrutural* rather than an automatic
// collapse.

import type { SourceBlock, RepetitionSuggestion } from "./types";
import {
  clamp,
  jaccard,
  levenshteinSim,
  normalizeChordSeq,
  normalizeLyric,
  seqSimilarity,
} from "./utils";

export type Fingerprint = {
  chordSeq: string[];
  chordSet: string[];
  chordCount: number;
  lineCount: number;
  phraseCount: number;
  estimatedMeasures: number;
  positionRatio: number; // 0..1
  lyricNorm: string;
  role: string; // canonical type
};

export function fingerprint(block: SourceBlock, index: number, total: number): Fingerprint {
  const chordSeq = normalizeChordSeq(block.chords);
  const lyric = block.lyric ?? "";
  const lineCount = lyric ? lyric.split(/\n+/).length : 0;
  const phraseCount = lyric ? lyric.split(/[.,;!?]\s+/).filter(Boolean).length : 0;
  return {
    chordSeq,
    chordSet: Array.from(new Set(chordSeq)),
    chordCount: chordSeq.length,
    lineCount,
    phraseCount,
    estimatedMeasures: Math.max(1, Math.round(chordSeq.length / 2)),
    positionRatio: total <= 1 ? 0 : index / (total - 1),
    lyricNorm: normalizeLyric(lyric),
    role: block.type,
  };
}

function shapeSim(a: Fingerprint, b: Fingerprint): number {
  const dLines = 1 - Math.min(1, Math.abs(a.lineCount - b.lineCount) / Math.max(1, a.lineCount || b.lineCount));
  const dMeasures =
    1 - Math.min(1, Math.abs(a.estimatedMeasures - b.estimatedMeasures) / Math.max(1, Math.max(a.estimatedMeasures, b.estimatedMeasures)));
  return clamp((dLines + dMeasures) / 2);
}

function positionSim(a: Fingerprint, b: Fingerprint): number {
  return a.role === b.role ? 1 : 0.4;
}

export type PairSimilarity = {
  chordSeqSim: number;
  chordSetSim: number;
  lyricSim: number;
  shapeSim: number;
  positionSim: number;
  overall: number;
};

export function similarity(a: Fingerprint, b: Fingerprint): PairSimilarity {
  const chordSeqSim = seqSimilarity(a.chordSeq, b.chordSeq);
  const chordSetSim = jaccard(a.chordSet, b.chordSet);
  const lyricSim =
    !a.lyricNorm && !b.lyricNorm ? 1 : levenshteinSim(a.lyricNorm, b.lyricNorm);
  const s = shapeSim(a, b);
  const p = positionSim(a, b);
  const overall =
    0.35 * chordSeqSim +
    0.1 * chordSetSim +
    0.3 * lyricSim +
    0.15 * s +
    0.1 * p;
  return {
    chordSeqSim,
    chordSetSim,
    lyricSim,
    shapeSim: s,
    positionSim: p,
    overall: clamp(overall),
  };
}

// -----------------------------
// StructureId assignment
// -----------------------------

const ROLE_PREFIX: Record<string, string> = {
  "INTRODUÇÃO": "intro",
  "REFRÃO": "chorus",
  "PRÉ-REFRÃO": "prechorus",
  "PONTE": "bridge",
  "SOLO": "solo",
  "INSTRUMENTAL": "instr",
  "INTERLÚDIO": "interlude",
  "FINALIZAÇÃO": "outro",
  "VAMP": "vamp",
  "VERSO": "verse",
};

function prefixFor(role: string): string {
  if (ROLE_PREFIX[role]) return ROLE_PREFIX[role];
  const m = role.match(/^PARTE\s*(\d+)/);
  if (m) return `verse`;
  return "block";
}

export type StructureAssignment = {
  /** structureId per source block, aligned by sourceIndex. */
  ids: string[];
  /** Suggestions for the 0.85..0.94 band (needs user confirmation). */
  suggestions: RepetitionSuggestion[];
  /** { structureId → indices } for content blocks. */
  groups: Map<string, number[]>;
};

const AUTO_MERGE = 0.95;
const SUGGEST = 0.85;

export function assignStructure(blocks: SourceBlock[]): StructureAssignment {
  const total = blocks.length;
  const fps = blocks.map((b, i) => fingerprint(b, i, total));
  const ids: string[] = new Array(total);
  const seedByRole = new Map<string, number>();
  const groups = new Map<string, number[]>();
  const suggestions: RepetitionSuggestion[] = [];

  for (let i = 0; i < total; i++) {
    let assigned: string | null = null;
    let bestJ = -1;
    let bestSim = 0;
    for (let j = 0; j < i; j++) {
      const s = similarity(fps[i], fps[j]);
      // Auto-merge only when both chords + lyric are essentially identical.
      if (s.chordSeqSim >= AUTO_MERGE && s.lyricSim >= AUTO_MERGE) {
        assigned = ids[j];
        break;
      }
      if (s.overall > bestSim) {
        bestSim = s.overall;
        bestJ = j;
      }
    }

    if (!assigned) {
      const role = fps[i].role;
      const prefix = prefixFor(role);
      const n = (seedByRole.get(prefix) ?? 0) + 1;
      seedByRole.set(prefix, n);
      assigned = `${prefix}-${n}`;

      // If we found a strong-but-not-perfect match, propose it.
      if (bestJ >= 0 && bestSim >= SUGGEST && bestSim < AUTO_MERGE) {
        suggestions.push({
          sourceIndex: i,
          targetStructureId: ids[bestJ],
          targetType: fps[bestJ].role,
          similarity: bestSim,
        });
      }
    }

    ids[i] = assigned;
    const list = groups.get(assigned) ?? [];
    list.push(i);
    groups.set(assigned, list);
  }

  return { ids, suggestions, groups };
}
