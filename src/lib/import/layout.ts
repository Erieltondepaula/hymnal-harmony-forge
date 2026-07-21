// Layout engine — minimal, extensible measurement pass used by the Preview
// to decide whether the ViewModel fits an A4 without visual breaks.
//
// This is intentionally conservative: chord chip widths and block heights
// are estimated in millimeters; the real DOM layout does the fine work.
// The engine returns a fit report the Preview surfaces to the user.

import type { ViewBlock } from "./types";

export type LayoutInputs = {
  pageWidthMm: number;
  pageHeightMm: number;
  marginMm: number;
  /** Approximate chip height in mm at the base font size. */
  chipHeightMm: number;
  /** Approximate mm consumed per chord chip (avg). */
  chipWidthMm: number;
  /** Vertical spacing between blocks in mm. */
  blockGapMm: number;
  /** Approximate mm consumed by a title line. */
  titleMm: number;
  /** Approximate mm consumed by a lyric line. */
  lyricMm: number;
  /** Approximate mm consumed by a `↺` reference line. */
  refMm: number;
};

export const DEFAULT_INPUTS: LayoutInputs = {
  pageWidthMm: 210,
  pageHeightMm: 297,
  marginMm: 12,
  chipHeightMm: 8,
  chipWidthMm: 14,
  blockGapMm: 6,
  titleMm: 7,
  lyricMm: 6,
  refMm: 10,
};

export type LayoutReport = {
  usedMm: number;
  availableMm: number;
  fitsA4: boolean;
  compactionUsed: 0 | 1 | 2 | 3;
  perBlockMm: number[];
};

function measureBlock(block: ViewBlock, inputs: LayoutInputs, compaction: number): number {
  if (block.kind === "ref") return inputs.refMm * (1 - compaction * 0.15);
  const chipsPerRow = Math.max(
    1,
    Math.floor((inputs.pageWidthMm - inputs.marginMm * 2) / inputs.chipWidthMm),
  );
  const rows = Math.max(1, Math.ceil(block.chords.length / chipsPerRow));
  const lyricLines = block.lyric ? block.lyric.split(/\n+/).length : 0;
  const noteLines = block.note ? 1 : 0;
  return (
    inputs.titleMm +
    rows * inputs.chipHeightMm +
    lyricLines * inputs.lyricMm +
    noteLines * inputs.lyricMm
  ).valueOf() * (1 - compaction * 0.08);
}

export function measureLayout(
  view: ViewBlock[],
  inputs: LayoutInputs = DEFAULT_INPUTS,
): LayoutReport {
  const availableMm = inputs.pageHeightMm - inputs.marginMm * 2;
  // Try compaction levels 0..3; pick the first that fits.
  for (let c = 0 as 0 | 1 | 2 | 3; c <= 3; c = (c + 1) as 0 | 1 | 2 | 3) {
    const perBlockMm = view.map((b) => measureBlock(b, inputs, c));
    const used = perBlockMm.reduce((n, mm) => n + mm, 0) + view.length * inputs.blockGapMm;
    if (used <= availableMm || c === 3) {
      return {
        usedMm: Math.round(used),
        availableMm: Math.round(availableMm),
        fitsA4: used <= availableMm,
        compactionUsed: c,
        perBlockMm,
      };
    }
  }
  // Should be unreachable, but keeps TS happy.
  const perBlockMm = view.map((b) => measureBlock(b, inputs, 3));
  const used = perBlockMm.reduce((n, mm) => n + mm, 0);
  return {
    usedMm: Math.round(used),
    availableMm: Math.round(availableMm),
    fitsA4: used <= availableMm,
    compactionUsed: 3,
    perBlockMm,
  };
}
