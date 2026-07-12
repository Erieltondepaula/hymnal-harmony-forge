import { useRef } from "react";
import type { Song } from "@/lib/song-store";
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

function colorFor(chord: string, palette: Record<string, string>) {
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

export function SongMapRenderer({ song, className }: { song: Song; className?: string }) {
  const prefs = usePreferences();
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
        {song.blocks.map((b) => {
          const single = b.chords.length === 1;
          return (
            <section key={b.id} className="break-inside-avoid">
              <div className="flex items-baseline gap-3">
                <h2 className="text-[16px] font-bold uppercase tracking-wide text-neutral-900">
                  {b.type}
                </h2>
                {b.repeat ? (
                  <span className="rounded-sm bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {b.repeat}
                  </span>
                ) : null}
              </div>

              {(() => {
                const count = b.chords.length;
                // Adjust font size + padding so long rows stay on ONE line.
                const dense =
                  count >= 12 ? "px-1 py-1 text-[10px]" :
                  count >= 9  ? "px-1.5 py-1 text-[11px]" :
                  count >= 7  ? "px-2 py-1 text-[12px]" :
                                "px-3 py-1.5 text-[15px]";
                return (
                  <div
                    className={cn(
                      "mt-1.5 grid overflow-hidden rounded-md border border-neutral-800",
                      single ? "w-fit" : "w-full",
                    )}
                    style={{
                      gridAutoFlow: "column",
                      gridAutoColumns: "minmax(0, 1fr)",
                    }}
                  >
                    {b.chords.map((c, i) => {
                      const color = colorFor(c, prefs.chordColors);
                      const isLast = i === count - 1;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "chord-cell min-w-0 whitespace-nowrap text-center font-semibold text-neutral-900 leading-tight",
                            dense,
                            !isLast && "border-r border-neutral-800",
                          )}
                          style={{
                            backgroundColor: color.bg,
                            WebkitPrintColorAdjust: "exact",
                            printColorAdjust: "exact",
                          }}
                        >
                          {c}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

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
        })}
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
