import type { Song } from "@/lib/song-store";
import { usePreferences, pageDimensionsMm } from "@/lib/preferences-store";
import { keyInterval } from "@/lib/harmonic-field";
import { cn } from "@/lib/utils";

// Soft pastel palette — light backgrounds so black chord text stays legible.
const CHORD_PALETTE = [
  { bg: "#FEE2E2", border: "#FCA5A5" },
  { bg: "#FFEDD5", border: "#FDBA74" },
  { bg: "#FEF3C7", border: "#FCD34D" },
  { bg: "#FEF9C3", border: "#FDE047" },
  { bg: "#ECFCCB", border: "#BEF264" },
  { bg: "#DCFCE7", border: "#86EFAC" },
  { bg: "#CCFBF1", border: "#5EEAD4" },
  { bg: "#CFFAFE", border: "#67E8F9" },
  { bg: "#DBEAFE", border: "#93C5FD" },
  { bg: "#E0E7FF", border: "#A5B4FC" },
  { bg: "#EDE9FE", border: "#C4B5FD" },
  { bg: "#F3E8FF", border: "#D8B4FE" },
  { bg: "#FAE8FF", border: "#F0ABFC" },
  { bg: "#FCE7F3", border: "#F9A8D4" },
  { bg: "#FFE4E6", border: "#FDA4AF" },
];

function colorFor(chord: string) {
  const key = chord.trim().replace(/[^A-Ga-g#b]/g, "").slice(0, 2) || chord;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return CHORD_PALETTE[hash % CHORD_PALETTE.length];
}

function formatToneLabel(originalKey: string, currentKey: string) {
  if (!originalKey || originalKey === currentKey) return currentKey;
  const diff = keyInterval(originalKey, currentKey);
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "";
  const abs = Math.abs(diff);
  let intervalText = "";
  if (abs > 0) {
    if (abs % 2 === 0) {
      const tons = abs / 2;
      intervalText = `${tons} ${tons === 1 ? "Tom" : "Tons"}`;
    } else {
      intervalText = `${abs} ${abs === 1 ? "semitom" : "semitons"}`;
    }
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

              <div
                className={cn(
                  "mt-1.5 flex overflow-hidden rounded-md border border-neutral-800",
                  single ? "w-fit" : "w-full",
                )}
              >
                {b.chords.map((c, i) => {
                  const color = colorFor(c);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "chord-cell px-4 py-1.5 text-center text-[15px] font-semibold text-neutral-900",
                        !single && "flex-1 min-w-0",
                        i < b.chords.length - 1 && "border-r border-neutral-800",
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
