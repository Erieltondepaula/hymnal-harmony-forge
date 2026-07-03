import type { Song } from "@/lib/song-store";
import { cn } from "@/lib/utils";

export function SongMapRenderer({ song, className }: { song: Song; className?: string }) {
  return (
    <div
      className={cn(
        "paper mx-auto w-full max-w-[860px] rounded-none px-14 py-12 font-sans",
        className,
      )}
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Header */}
      <header className="mb-8 border-b border-neutral-300 pb-6">
        <h1 className="text-[36px] font-bold uppercase tracking-tight leading-none text-neutral-900">
          {song.title || "Sem título"}
        </h1>
        {song.artist ? (
          <div className="mt-1 text-[15px] text-neutral-500">{song.artist}</div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-[14px] text-neutral-700">
          <MetaItem label="TOM" value={song.key} />
          <MetaItem label="BPM" value={`${song.bpm}${song.bpmEstimated ? " (est.)" : ""}`} />
          <MetaItem label="COMPASSO" value={song.time} />
          <MetaItem label="RITMO" value={song.rhythm} />
        </div>

        {/* Rhythm pattern */}
        <div className="mt-4 text-neutral-800">
          <div className="text-[13px] font-semibold tracking-wider text-neutral-500">RITMO</div>
          <div className="mt-1 whitespace-pre-wrap break-words font-mono text-[15px] leading-6">
            {song.rhythmArrows?.trim() || "↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓"}
          </div>
          <div className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-neutral-500">
            {song.rhythmCounts?.trim() || "1 | 2 | 3 | 4 |"}
          </div>
        </div>

      </header>

      {/* Blocks */}
      <div className="space-y-6">
        {song.blocks.map((b) => (
          <section key={b.id} className="break-inside-avoid">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[18px] font-bold uppercase tracking-wide text-neutral-900">
                {b.type}
              </h2>
              {b.repeat ? (
                <span className="rounded-sm bg-neutral-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {b.repeat}
                </span>
              ) : null}
            </div>

            <div className="mt-2 grid grid-flow-col auto-cols-fr overflow-hidden rounded-sm border border-neutral-800">
              {b.chords.map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    "px-3 py-2 text-center text-[15px] font-semibold text-neutral-900",
                    i < b.chords.length - 1 && "border-r border-neutral-800",
                  )}
                >
                  {c}
                </div>
              ))}
            </div>

            {b.lyric ? (
              <p className="mt-2 text-[14px] italic text-neutral-700">{b.lyric}</p>
            ) : null}
            {b.note ? (
              <p className="mt-1 text-[13px] text-neutral-500">OBS: {b.note}</p>
            ) : null}
          </section>
        ))}
      </div>

      <footer className="mt-10 border-t border-neutral-200 pt-4 text-[11px] text-neutral-400">
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
