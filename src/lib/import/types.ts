// Types for the intelligent import pipeline.
//
// The system keeps two representations:
//  - SourceModel: what was imported, verbatim (never rewritten by optimizations).
//  - ViewModel:   derived layout with reused blocks collapsed to references.
//
// Anything that "optimizes" the map must live on the ViewModel.

import type { ParsedCifraSong, ParsedCifraBlock } from "@/lib/cifra-parser";

// -----------------------------
// SourceModel
// -----------------------------

export type SourceBlock = ParsedCifraBlock & {
  /** Position in the imported song (0-based). Stable across re-analysis. */
  sourceIndex: number;
};

export type SourceModel = ParsedCifraSong & {
  blocks: SourceBlock[];
};

// -----------------------------
// ViewModel
// -----------------------------

export type ContentViewBlock = {
  kind: "content";
  sourceIndex: number;
  /** Canonical id used to reference this block ("chorus-1", "verse-2", ...). */
  structureId: string;
  /** Canonical label ("REFRÃO", "PARTE 1", ...). Same as source.type after classification. */
  type: string;
  chords: string[];
  repeat?: string | null;
  lyric?: string | null;
  note?: string | null;
};

export type RefViewBlock = {
  kind: "ref";
  /** Points at the first ContentViewBlock with the same structureId. */
  structureId: string;
  /** Human label shown as the chip, e.g. "↺ Voltar ao REFRÃO". */
  label: string;
  /** Original type kept for tooltips / accessibility. */
  targetType: string;
};

export type ViewBlock = ContentViewBlock | RefViewBlock;

export type ViewModel = {
  blocks: ViewBlock[];
};

// -----------------------------
// Analysis + Score
// -----------------------------

export type RepetitionSuggestion = {
  sourceIndex: number;
  targetStructureId: string;
  targetType: string;
  similarity: number;
};

export type DerivedMetadata = {
  estimatedDuration: number; // seconds
  estimatedTempo: number;
  averageChordDensity: number; // chords per line
  difficulty: "easy" | "med" | "hard";
  uniqueBlocks: number;
  repeatedBlocks: number;
};

export type ImportAnalysis = {
  reused: Array<{ structureId: string; count: number; type: string }>;
  suggestions: RepetitionSuggestion[];
  savingsPct: number; // 0..100
  derived: DerivedMetadata;
};

export type QualityCheck = {
  label: string;
  ok: boolean;
  detail?: string;
};

export type ImportScore = {
  overall: number; // 0..100
  checks: QualityCheck[];
};

export type ImportResult = {
  source: SourceModel;
  view: ViewModel;
  analysis: ImportAnalysis;
  score: ImportScore;
};
