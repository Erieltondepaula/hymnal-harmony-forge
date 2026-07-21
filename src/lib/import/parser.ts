// Thin wrapper around the existing AI parser + local fallback, returning a
// SourceModel that carries stable sourceIndex values.

import type { SourceBlock, SourceModel } from "./types";
import { parseCifra } from "@/lib/ai.functions";
import { parseCifraLocally, type ParsedCifraSong } from "@/lib/cifra-parser";
import { classifyBlocks } from "./classifier";

export type ParseInput = {
  text: string;
  titleHint?: string;
  artistHint?: string;
  /** If provided, the caller supplies a bound useServerFn(parseCifra). */
  runParse?: (args: { data: { text: string; titleHint?: string; artistHint?: string } }) => Promise<ParsedCifraSong>;
};

function toSource(parsed: ParsedCifraSong): SourceModel {
  const classified = classifyBlocks(parsed.blocks);
  const blocks: SourceBlock[] = classified.map((b, i) => ({
    ...b,
    sourceIndex: i,
  }));
  return { ...parsed, blocks };
}

export async function parseToSource(input: ParseInput): Promise<SourceModel> {
  const local = parseCifraLocally(input.text, {
    titleHint: input.titleHint,
    artistHint: input.artistHint,
  });
  if (!input.runParse) return toSource(local);
  try {
    const remote = await input.runParse({
      data: {
        text: input.text,
        titleHint: input.titleHint,
        artistHint: input.artistHint,
      },
    });
    return toSource(remote);
  } catch {
    return toSource(local);
  }
}
