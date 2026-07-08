import type { Song } from "@/lib/song-store";
import { cn } from "@/lib/utils";

// Soft pastel palette — light backgrounds so black chord text stays legible.
const CHORD_PALETTE = [
  { bg: "#FEE2E2", border: "#FCA5A5" }, // red
  { bg: "#FFEDD5", border: "#FDBA74" }, // orange
  { bg: "#FEF3C7", border: "#FCD34D" }, // amber
  { bg: "#FEF9C3", border: "#FDE047" }, // yellow
  { bg: "#ECFCCB", border: "#BEF264" }, // lime
  { bg: "#DCFCE7", border: "#86EFAC" }, // green
  { bg: "#CCFBF1", border: "#5EEAD4" }, // teal
  { bg: "#CFFAFE", border: "#67E8F9" }, // cyan
  { bg: "#DBEAFE", border: "#93C5FD" }, // blue
  { bg: "#E0E7FF", border: "#A5B4FC" }, // indigo
  { bg: "#EDE9FE", border: "#C4B5FD" }, // violet
  { bg: "#F3E8FF", border: "#D8B4FE" }, // purple
  { bg: "#FAE8FF", border: "#F0ABFC" }, // fuchsia
  { bg: "#FCE7F3", border: "#F9A8D4" }, // pink
  { bg: "#FFE4E6", border: "#FDA4AF" }, // rose
];

// Deterministic color from chord root note — same chord always gets same color.
function colorFor(chord: string) {
  const key = chord.trim().replace(/[^A-Ga-g#b]/g, "").slice(0, 2) || chord;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return CHORD_PALETTE[hash % CHORD_PALETTE.length];
}

export function SongMapRenderer({ song, className }: { song: Song; className?: string }) {
  return (
    <div
      className={cn(
        "print-area paper mx-auto w-full max-w-[860px] rounded-none px-10 py-8 font-sans",
        className,
      )}
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <header className="mb-6 border-b border-neutral-300 pb-4">
        <h1 className="text-[32px] font-bold uppercase tracking-tight leading-none text-neutral-900">
          {song.title || "Sem título"}
        </h1>
        {song.artist ? (
          <div className="mt-1 text-[14px] text-neutral-500">{song.artist}</div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[13px] text-neutral-700">
          <MetaItem label="TOM" value={song.key} />
          <MetaItem label="BPM" value={`${song.bpm}${song.bpmEstimated ? " (est.)" : ""}`} />
          <MetaItem label="COMPASSO" value={song.time} />
          <MetaItem label="RITMO" value={song.rhythm} />
        </div>

        {/* Rhythm pattern */}
        <div className="mt-3 text-neutral-800">
          <div className="text-[12px] font-semibold tracking-wider text-neutral-500">RITMO</div>
          <div className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[14px] leading-6">
            {song.rhythmArrows?.trim() || "↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓"}
          </div>
          <div className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-neutral-500">
            {song.rhythmCounts?.trim() || "1 | 2 | 3 | 4 |"}
          </div>
        </div>
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
                <p className="mt-1.5 text-[13px] italic text-neutral-700">{b.lyric}</p>
              ) : null}
              {b.note ? (
                <p className="mt-0.5 text-[12px] text-neutral-500">OBS: {b.note}</p>
              ) : null}
            </section>
          );
        })}
      </div>

      <footer className="mt-8 border-t border-neutral-200 pt-3 text-[10px] text-neutral-400">
        Gerado por MapaLouvor
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
