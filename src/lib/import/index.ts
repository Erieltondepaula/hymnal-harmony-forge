// Orchestrator for the intelligent import pipeline.
//
//   extractText → parseCifra → classify → detectRepetitions →
//   buildViewModel → runLayoutEngine → scoreQuality → Preview → confirm → save
//
// The caller supplies the raw text (already extracted from PDF/DOCX/TXT/RTF
// or fetched from Cifra Club) plus optional hints.

import { assignStructure } from "./repetition";
import { buildViewModel, computeDerived, computeScore, savingsPct } from "./preview";
import { measureLayout } from "./layout";
import { parseToSource, type ParseInput } from "./parser";
import type { ImportResult } from "./types";

export * from "./types";

export async function runImportPipeline(input: ParseInput): Promise<ImportResult> {
  const source = await parseToSource(input);
  const assignment = assignStructure(source.blocks);
  const { view, reused } = buildViewModel(source, assignment);
  const layout = measureLayout(view.blocks);
  const derived = computeDerived(source);
  const score = computeScore(view, source, reused);
  return {
    source,
    view,
    analysis: {
      reused,
      suggestions: assignment.suggestions,
      savingsPct: savingsPct(source, view),
      derived,
    },
    // Attach layout info via score checks (already covers "Cabe em A4"); we
    // refine that check with the layout engine result here.
    score: {
      ...score,
      checks: score.checks.map((c) =>
        c.label === "Cabe em A4" ? { ...c, ok: layout.fitsA4 } : c,
      ),
    },
  };
}
