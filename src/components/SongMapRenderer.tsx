import { useRef, useState } from "react";
import type { Song, Block } from "@/lib/song-store";
import { useSongStore } from "@/lib/song-store";
import { usePreferences, pageDimensionsMm, DEFAULT_CHORD_COLORS } from "@/lib/preferences-store";
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

export function SongMapRenderer({ song, className, editable = false }: { song: Song; className?: string; editable?: boolean }) {
  const prefs = usePreferences();
  const updateBlock = useSongStore((s) => s.updateBlock);
  const { w, h } = pageDimensionsMm(prefs);
  const usableW = Math.max(50, w - prefs.marginMm * 2);

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
      {/* Dynamic @page for print */}
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

      {/* Header */}
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

      {/* Blocks */}
      <div className="space-y-4">
        {song.blocks.map((b) => (
          <BlockSection
            key={b.id}
            songId={song.id}
            block={b}
            editable={editable}
            palette={prefs.chordColors}
            updateBlock={updateBlock}
          />
        ))}
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

function ChordCell({
  chord,
  bg,
  dense,
  isLast,
  editable,
  onChangeColor,
  onClearColor,
}: {
  chord: string;
  bg: string;
  dense: string;
  isLast: boolean;
  editable: boolean;
  onChangeColor: (hex: string) => void;
  onClearColor: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div
      className={cn(
        "chord-cell group relative min-w-0 whitespace-nowrap text-center font-semibold text-neutral-900 leading-tight",
        dense,
        !isLast && "border-r border-neutral-800",
        editable && "cursor-pointer",
      )}
      style={{
        backgroundColor: bg,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
      onClick={editable ? () => inputRef.current?.click() : undefined}
      onContextMenu={
        editable
          ? (e) => {
              e.preventDefault();
              onClearColor();
            }
          : undefined
      }
      title={editable ? "Clique para mudar a cor · botão direito para restaurar" : undefined}
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
