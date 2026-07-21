import { useRef, useState, useMemo } from "react";
import type { Song, Block } from "@/lib/song-store";
import { useSongStore } from "@/lib/song-store";
import {
  usePreferences,
  pageDimensionsMm,
  DEFAULT_CHORD_COLORS,
  type ChordViewMode,
} from "@/lib/preferences-store";
import { keyInterval } from "@/lib/harmonic-field";
import { cn } from "@/lib/utils";

function rootOf(chord: string): string {
  const m = chord.trim().match(/^([A-G])([#b])?/);
  if (!m) return "C";
  const flatMap: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
  const root = m[1] + (m[2] ?? "");
  return flatMap[root] ?? root;
}

function colorFor(chord: string, palette: Record<string, string>, override?: string | null) {
  if (override) return { bg: override };
  const root = rootOf(chord);
  const bg = palette[root] || DEFAULT_CHORD_COLORS[root] || "#F3F4F6";
  return { bg };
}

function formatToneLabel(originalKey: string, currentKey: string) {
  if (!originalKey || originalKey === currentKey) return currentKey;
  const diff = keyInterval(originalKey, currentKey);
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "";
  const abs = Math.abs(diff);
  let intervalText = "";
  if (abs > 0) {
    const whole = Math.floor(abs / 2);
    const half = abs % 2 === 1;
    if (whole === 0) intervalText = "½ tom";
    else if (half) intervalText = `${whole}½ tons`;
    else intervalText = `${whole} ${whole === 1 ? "tom" : "tons"}`;
  }
  return `${originalKey} → ${currentKey}${arrow ? ` ${arrow} ${intervalText}` : ""}`;
}

export function SongMapRenderer({
  song,
  className,
  editable = false,
  viewMode,
}: {
  song: Song;
  className?: string;
  editable?: boolean;
  viewMode?: ChordViewMode;
}) {
  const prefs = usePreferences();
  const updateBlock = useSongStore((s) => s.updateBlock);
  const { w, h } = pageDimensionsMm(prefs);
  const usableW = Math.max(50, w - prefs.marginMm * 2);
  const mode: ChordViewMode = viewMode ?? prefs.chordViewMode ?? "smart";
  const measureSize = Math.max(2, prefs.measureChordCount || 4);

  const show = {
    key: song.show?.key ?? true,
    bpm: song.show?.bpm ?? true,
    time: song.show?.time ?? true,
    rhythm: song.show?.rhythm ?? true,
    batida: song.show?.batida ?? true,
    capo: song.show?.capo ?? true,
  };
  const hasCapo = show.capo && !!song.capo && song.capo > 0;
  const toneLabel = formatToneLabel(song.originalKey, song.key);
  const hasHeader =
    prefs.showPdfHeader &&
    (prefs.churchName || prefs.ministryName || prefs.logoUrl);

  const dateStr = new Date().toLocaleDateString("pt-BR");

  return (
    <div
      className={cn(
        "print-area paper mx-auto w-full rounded-none font-sans",
        className,
      )}
      style={{
        width: `${usableW}mm`,
        maxWidth: `${usableW}mm`,
        minHeight: `${Math.max(100, h - prefs.marginMm * 2)}mm`,
        padding: "10mm 12mm",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <style>{`@media print { @page { size: ${
        prefs.pageSize === "custom" ? `${w}mm ${h}mm` : `${prefs.pageSize === "Carta" ? "Letter" : prefs.pageSize} portrait`
      }; margin: ${prefs.marginMm}mm; } }`}</style>

      {hasHeader ? (
        <div className="mb-4 flex items-center gap-3 border-b border-neutral-200 pb-3">
          {prefs.logoUrl ? (
            <img
              src={prefs.logoUrl}
              alt=""
              className="h-10 w-10 rounded object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          <div className="text-[12px] leading-tight text-neutral-700">
            {prefs.churchName ? (
              <div className="font-semibold text-neutral-900">{prefs.churchName}</div>
            ) : null}
            {prefs.ministryName ? <div>{prefs.ministryName}</div> : null}
          </div>
        </div>
      ) : null}

      <header className="mb-6 border-b border-neutral-300 pb-4">
        <h1 className="text-[32px] font-bold uppercase tracking-tight leading-none text-neutral-900">
          {song.title || "Sem título"}
        </h1>
        {song.artist ? (
          <div className="mt-1 text-[14px] text-neutral-500">{song.artist}</div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[13px] text-neutral-700">
          {show.key ? <MetaItem label="TOM" value={toneLabel} /> : null}
          {hasCapo ? <MetaItem label="CAPOTRASTE" value={`Casa ${song.capo}`} /> : null}
          {show.bpm ? (
            <MetaItem label="BPM" value={`${song.bpm}${song.bpmEstimated ? " (est.)" : ""}`} />
          ) : null}
          {show.time ? <MetaItem label="COMPASSO" value={song.time} /> : null}
          {show.rhythm ? <MetaItem label="RITMO" value={song.rhythm} /> : null}
        </div>

        {show.batida ? (
          <div className="mt-3 text-neutral-800">
            <div className="text-[12px] font-semibold tracking-wider text-neutral-500">BATIDA</div>
            <div className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[14px] leading-6">
              {song.rhythmArrows?.trim() || "↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓"}
            </div>
            <div className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-neutral-500">
              {song.rhythmCounts?.trim() || "1 | 2 | 3 | 4 |"}
            </div>
          </div>
        ) : null}
      </header>

      <div className="space-y-4">
        {(() => {
          const blockById = new Map(song.blocks.map((b, idx) => [idx, b]));
          const structure = song.structure;
          if (!structure || structure.length === 0) {
            return song.blocks.map((b) => (
              <BlockSection
                key={b.id}
                songId={song.id}
                block={b}
                editable={editable}
                palette={prefs.chordColors}
                updateBlock={updateBlock}
                mode={mode}
                measureSize={measureSize}
              />
            ));
          }
          return structure.map((entry, i) => {
            if (entry.kind === "ref") {
              return <RefBlock key={`ref-${i}`} label={entry.label} />;
            }
            const b = blockById.get(entry.sourceIndex);
            if (!b) return null;
            return (
              <BlockSection
                key={b.id}
                songId={song.id}
                block={b}
                editable={editable}
                palette={prefs.chordColors}
                updateBlock={updateBlock}
                mode={mode}
                measureSize={measureSize}
              />
            );
          });
        })()}
      </div>

      <footer className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-3 text-[10px] text-neutral-400">
        <span>{prefs.footerText || ""}</span>
        <span className="flex gap-3">
          {prefs.showDate ? <span>{dateStr}</span> : null}
          {prefs.showPageNumber ? <span>Página 1</span> : null}
        </span>
      </footer>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span className="text-[15px] font-semibold text-neutral-900">{value}</span>
    </div>
  );
}

function groupIndexOf(groups: number[][] | undefined, idx: number): number {
  if (!groups) return -1;
  return groups.findIndex((g) => g.includes(idx));
}

/**
 * Smart Chord Layout — chips of dynamic width, uniform height, never
 * truncated. Four view modes drive spacing and wrapping.
 */
function BlockSection({
  songId,
  block: b,
  editable,
  palette,
  updateBlock,
  mode,
  measureSize,
}: {
  songId: string;
  block: Block;
  editable: boolean;
  palette: Record<string, string>;
  updateBlock: (songId: string, blockId: string, patch: Partial<Block>) => void;
  mode: ChordViewMode;
  measureSize: number;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const groups = b.chordGroups ?? [];
  const sortedSel = Array.from(selected).sort((a, z) => a - z);
  const isConsecutive =
    sortedSel.length >= 2 &&
    sortedSel.every((v, i) => i === 0 || v === sortedSel[i - 1] + 1);

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const commitGroup = () => {
    if (!isConsecutive) return;
    const range = new Set(sortedSel);
    const remaining: number[][] = [];
    for (const g of groups) {
      if (g.some((i) => range.has(i) || range.has(i - 1) || range.has(i + 1))) {
        g.forEach((i) => range.add(i));
      } else {
        remaining.push(g);
      }
    }
    const merged = Array.from(range).sort((a, z) => a - z);
    updateBlock(songId, b.id, { chordGroups: [...remaining, merged] });
    setSelected(new Set());
    setSelectMode(false);
  };

  const ungroup = (gi: number) => {
    const next = groups.filter((_, i) => i !== gi);
    updateBlock(songId, b.id, { chordGroups: next });
  };

  const setColor = (i: number, hex: string) => {
    const next = [...(b.chordColors ?? [])];
    while (next.length < b.chords.length) next.push(null);
    next[i] = hex;
    updateBlock(songId, b.id, { chordColors: next });
  };
  const clearColor = (i: number) => {
    if (!b.chordColors) return;
    const next = [...b.chordColors];
    next[i] = null;
    updateBlock(songId, b.id, { chordColors: next });
  };

  // Build runs: contiguous chords not in the same group render as
  // individual chips; grouped chords render inside a bracket container.
  type Run = { key: string; kind: "solo" | "group"; groupIdx?: number; indices: number[] };
  const runs = useMemo<Run[]>(() => {
    const out: Run[] = [];
    for (let i = 0; i < b.chords.length; i++) {
      const gi = groupIndexOf(groups, i);
      if (gi >= 0) {
        const g = groups[gi].slice().sort((a, z) => a - z);
        out.push({ key: `g-${gi}-${g[0]}`, kind: "group", groupIdx: gi, indices: g });
        i = g[g.length - 1];
      } else {
        out.push({ key: `s-${i}`, kind: "solo", indices: [i] });
      }
    }
    return out;
  }, [b.chords.length, groups]);

  // In measures mode, we slice the runs into groups of `measureSize` chords
  // (counting individual chord positions, not runs). Grouped runs count as
  // one chord for measure purposes so a fast group stays together.
  const measures = useMemo<Run[][]>(() => {
    if (mode !== "measures") return [];
    const out: Run[][] = [];
    let cur: Run[] = [];
    let count = 0;
    for (const r of runs) {
      cur.push(r);
      count += 1;
      if (count >= measureSize) {
        out.push(cur);
        cur = [];
        count = 0;
      }
    }
    if (cur.length) out.push(cur);
    return out;
  }, [mode, runs, measureSize]);

  const chipSize =
    mode === "compact"
      ? "h-8 px-2.5 text-[12px]"
      : "h-9 px-3 text-[14px]";

  const gap = mode === "compact" ? "gap-1" : "gap-2";

  const containerCls =
    mode === "scroll"
      ? cn("flex flex-nowrap items-center overflow-x-auto pb-1", gap)
      : mode === "measures"
        ? "flex flex-wrap items-stretch gap-x-3 gap-y-2"
        : cn("flex flex-wrap items-center", gap);

  const renderRun = (r: Run) => {
    if (r.kind === "solo") {
      const i = r.indices[0];
      const c = b.chords[i];
      const override = b.chordColors?.[i] ?? null;
      const { bg } = colorFor(c, palette, override);
      return (
        <ChordChip
          key={r.key}
          chord={c}
          bg={bg}
          sizeCls={chipSize}
          editable={editable}
          selectMode={selectMode}
          selected={selected.has(i)}
          onShiftClick={() => toggleSelect(i)}
          onChangeColor={(hex) => setColor(i, hex)}
          onClearColor={() => clearColor(i)}
        />
      );
    }
    // grouped run — bracketed cluster
    return (
      <div
        key={r.key}
        className="relative inline-flex items-stretch rounded-lg ring-2 ring-neutral-900"
        style={{ padding: 2 }}
        title="Acordes rápidos — botão direito para desagrupar"
        onContextMenu={
          editable
            ? (e) => {
                e.preventDefault();
                if (r.groupIdx !== undefined) ungroup(r.groupIdx);
              }
            : undefined
        }
      >
        <div className={cn("flex items-center", mode === "compact" ? "gap-0.5" : "gap-1")}>
          {r.indices.map((i) => {
            const c = b.chords[i];
            const override = b.chordColors?.[i] ?? null;
            const { bg } = colorFor(c, palette, override);
            return (
              <ChordChip
                key={i}
                chord={c}
                bg={bg}
                sizeCls={chipSize}
                editable={editable}
                selectMode={selectMode}
                selected={selected.has(i)}
                compact
                onShiftClick={() => toggleSelect(i)}
                onChangeColor={(hex) => setColor(i, hex)}
                onClearColor={() => clearColor(i)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="break-inside-avoid">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-[16px] font-bold uppercase tracking-wide text-neutral-900">
          {b.type}
        </h2>
        {b.repeat ? (
          <span className="rounded-sm bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white">
            {b.repeat}
          </span>
        ) : null}
        {editable ? (
          <button
            type="button"
            onClick={() => {
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
            className={cn(
              "rounded-sm border px-2 py-0.5 text-[11px] font-semibold print:hidden",
              selectMode
                ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100",
            )}
            title="Marcar acordes rápidos (tocados muito próximos)"
          >
            {selectMode ? "Cancelar seleção" : "Marcar rápidos"}
          </button>
        ) : null}
        {editable && selectMode && isConsecutive ? (
          <button
            type="button"
            onClick={commitGroup}
            className="rounded-sm border border-neutral-900 bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-neutral-800 print:hidden"
          >
            Agrupar ({sortedSel.length})
          </button>
        ) : null}
        {editable && selectMode ? (
          <span className="text-[11px] text-neutral-500 print:hidden">
            {selected.size === 0
              ? "Clique nos acordes vizinhos tocados rápido"
              : !isConsecutive
                ? "Selecione acordes vizinhos"
                : "Confirme o agrupamento"}
          </span>
        ) : null}
      </div>

      <div className="mt-2">
        {mode === "measures" ? (
          <div className="flex flex-wrap items-stretch gap-x-3 gap-y-2">
            {measures.map((m, mi) => (
              <div
                key={mi}
                className="flex items-center gap-1.5 rounded-md border-x-2 border-neutral-400 bg-neutral-50/60 px-2 py-1"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                {m.map(renderRun)}
              </div>
            ))}
          </div>
        ) : (
          <div className={containerCls}>{runs.map(renderRun)}</div>
        )}
      </div>

      {b.lyric ? (
        <p className="mt-2 text-[15px] font-medium leading-relaxed text-neutral-900">
          {b.lyric}
        </p>
      ) : null}
      {b.note ? (
        <div
          className="mt-2 flex items-start gap-2 rounded-md border-l-4 border-amber-500 bg-amber-50 px-3 py-2"
          style={{
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          <span className="text-[13px] font-bold uppercase tracking-wider text-amber-700">
            OBS:
          </span>
          <span className="text-[14px] font-semibold leading-snug text-amber-900">
            {b.note}
          </span>
        </div>
      ) : null}
    </section>
  );
}

function ChordChip({
  chord,
  bg,
  sizeCls,
  editable,
  selectMode,
  selected,
  compact = false,
  onShiftClick,
  onChangeColor,
  onClearColor,
}: {
  chord: string;
  bg: string;
  sizeCls: string;
  editable: boolean;
  selectMode: boolean;
  selected: boolean;
  compact?: boolean;
  onShiftClick: () => void;
  onChangeColor: (hex: string) => void;
  onClearColor: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div
      className={cn(
        "chord-cell relative inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold text-neutral-900 leading-none select-none",
        "shadow-sm ring-1 ring-black/5 transition-transform",
        sizeCls,
        editable && "cursor-pointer hover:shadow-md hover:-translate-y-[1px]",
        selected && "ring-2 ring-blue-500",
        compact && "shadow-none ring-0",
      )}
      style={{
        backgroundColor: bg,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
      onClick={
        editable
          ? (e) => {
              if (selectMode || e.shiftKey) {
                e.preventDefault();
                onShiftClick();
                return;
              }
              inputRef.current?.click();
            }
          : undefined
      }
      onContextMenu={
        editable
          ? (e) => {
              e.preventDefault();
              onClearColor();
            }
          : undefined
      }
      title={
        editable
          ? selectMode
            ? "Clique para selecionar/desselecionar"
            : "Clique: cor · Shift+clique: agrupar · Botão direito: limpar cor"
          : undefined
      }
    >
      {chord}
      {editable ? (
        <input
          ref={inputRef}
          type="color"
          className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0 print:hidden"
          onChange={(e) => onChangeColor(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : null}
    </div>
  );
}
