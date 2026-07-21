// Build the ViewModel from a SourceModel + StructureAssignment, and derive
// a quality Score + metadata used by the Preview card.

import type {
  ContentViewBlock,
  DerivedMetadata,
  ImportAnalysis,
  ImportScore,
  RefViewBlock,
  SourceModel,
  ViewBlock,
  ViewModel,
} from "./types";
import type { StructureAssignment } from "./repetition";

function refLabel(sameType: boolean, targetType: string): string {
  return sameType ? `↺ Repetir ${targetType}` : `↺ Voltar ao ${targetType}`;
}

export function buildViewModel(
  source: SourceModel,
  assignment: StructureAssignment,
): { view: ViewModel; reused: ImportAnalysis["reused"] } {
  const blocks: ViewBlock[] = [];
  const emitted = new Set<string>();
  const reusedCounts = new Map<string, { count: number; type: string }>();

  for (let i = 0; i < source.blocks.length; i++) {
    const src = source.blocks[i];
    const structureId = assignment.ids[i];

    if (!emitted.has(structureId)) {
      emitted.add(structureId);
      const content: ContentViewBlock = {
        kind: "content",
        sourceIndex: src.sourceIndex,
        structureId,
        type: src.type,
        chords: src.chords,
        repeat: src.repeat ?? null,
        lyric: src.lyric ?? null,
        note: src.note ?? null,
      };
      blocks.push(content);
    } else {
      // Reference — find target type via first occurrence.
      const firstIdx = assignment.groups.get(structureId)?.[0] ?? i;
      const target = source.blocks[firstIdx];
      const ref: RefViewBlock = {
        kind: "ref",
        structureId,
        targetType: target.type,
        label: refLabel(src.type === target.type, target.type),
      };
      blocks.push(ref);
      const prev = reusedCounts.get(structureId);
      reusedCounts.set(structureId, {
        count: (prev?.count ?? 1) + 1,
        type: target.type,
      });
    }
  }

  const reused = Array.from(reusedCounts.entries()).map(([structureId, v]) => ({
    structureId,
    count: v.count,
    type: v.type,
  }));

  return { view: { blocks }, reused };
}

export function computeDerived(source: SourceModel): DerivedMetadata {
  const totalChords = source.blocks.reduce((n, b) => n + b.chords.length, 0);
  const withLyric = source.blocks.filter((b) => b.lyric).length;
  const lines = source.blocks.reduce(
    (n, b) => n + (b.lyric ? b.lyric.split(/\n+/).length : 1),
    0,
  );
  const density = lines > 0 ? totalChords / lines : totalChords;
  const estimatedDuration = Math.round((totalChords * 60) / Math.max(40, source.bpm));
  const difficulty: DerivedMetadata["difficulty"] =
    density < 3 ? "easy" : density < 6 ? "med" : "hard";
  const unique = new Set(source.blocks.map((b) => b.chords.join("|"))).size;
  return {
    estimatedDuration,
    estimatedTempo: source.bpm,
    averageChordDensity: Math.round(density * 10) / 10,
    difficulty,
    uniqueBlocks: unique,
    repeatedBlocks: Math.max(0, source.blocks.length - unique),
    // withLyric surfaces as a debug hint via density.
    ...(withLyric >= 0 ? {} : {}),
  };
}

export function computeScore(
  view: ViewModel,
  source: SourceModel,
  reused: ImportAnalysis["reused"],
): ImportScore {
  const structureRecognized = source.blocks.every((b) => Boolean(b.type));
  const hasChorus = source.blocks.some((b) => /REFR/.test(b.type));
  const anyReused = reused.length > 0;
  const refCount = view.blocks.filter((b) => b.kind === "ref").length;
  const totalBlocks = source.blocks.length;
  const optimized = refCount > 0;
  // Heuristic: heavy songs likely spill to a second page.
  const contentBlocks = view.blocks.filter((b) => b.kind === "content").length;
  const fitsA4 = contentBlocks <= 8;

  const checks = [
    { label: "Estrutura reconhecida", ok: structureRecognized },
    { label: "Refrões encontrados", ok: hasChorus },
    {
      label: "Blocos reutilizados",
      ok: anyReused,
      detail: reused.map((r) => `${r.type} ×${r.count}`).join(", ") || undefined,
    },
    { label: "Layout otimizado", ok: optimized || totalBlocks <= 4 },
    { label: "Cabe em A4", ok: fitsA4 },
  ];
  const overall = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { overall, checks };
}

export function savingsPct(source: SourceModel, view: ViewModel): number {
  const sourceChords = source.blocks.reduce((n, b) => n + b.chords.length, 0);
  const viewChords = view.blocks.reduce(
    (n, b) => (b.kind === "content" ? n + b.chords.length : n),
    0,
  );
  if (sourceChords === 0) return 0;
  return Math.round((1 - viewChords / sourceChords) * 100);
}
