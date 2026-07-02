import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Star, Music2, Clock } from "lucide-react";
import { useSongStore } from "@/lib/song-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca")({
  component: Library,
});

const TAGS = ["Adoração", "Ministração", "Ceia", "Ofertório", "Abertura", "Natal", "Instrumental"];

function Library() {
  const songs = useSongStore((s) => s.songs);
  const toggleFavorite = useSongStore((s) => s.toggleFavorite);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);

  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    return songs
      .filter((s) => {
        if (favOnly && !s.favorite) return false;
        if (tag && !(s.tags ?? []).includes(tag)) return false;
        if (query && ![s.title, s.artist, s.key, String(s.bpm), s.rhythm].join(" ").toLowerCase().includes(query))
          return false;
        return true;
      })
      .sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || b.updatedAt - a.updatedAt);
  }, [songs, q, tag, favOnly]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="h-song">Biblioteca</h1>
        <p className="text-[15px] text-muted-foreground">
          {songs.length} {songs.length === 1 ? "música" : "músicas"} no seu ministério.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título, artista, tom, BPM..."
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          onClick={() => setFavOnly((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors",
            favOnly ? "border-warning/50 bg-warning/10 text-warning" : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          <Star className={cn("h-4 w-4", favOnly && "fill-warning")} />
          Favoritos
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <TagChip label="Todas" active={tag === null} onClick={() => setTag(null)} />
        {TAGS.map((t) => (
          <TagChip key={t} label={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40"
            style={{ transitionDuration: "180ms" }}
          >
            <div className="flex items-start justify-between gap-2">
              <Link to="/editor/$id" params={{ id: s.id }} className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Music2 className="h-5 w-5" />
              </Link>
              <button
                onClick={() => toggleFavorite(s.id)}
                className="text-muted-foreground hover:text-warning"
              >
                <Star className={cn("h-4 w-4", s.favorite && "fill-warning text-warning")} />
              </button>
            </div>
            <Link to="/editor/$id" params={{ id: s.id }}>
              <div className="mt-4 truncate text-[18px] font-semibold">{s.title}</div>
              <div className="truncate text-[14px] text-muted-foreground">{s.artist || "—"}</div>
            </Link>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(s.tags ?? []).map((t) => (
                <span key={t} className="rounded-md bg-accent px-2 py-0.5 text-[11px] text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-[13px] text-muted-foreground">
              <div className="flex gap-3">
                <span>
                  Tom <span className="font-medium text-foreground">{s.key}</span>
                </span>
                <span>
                  BPM <span className="font-medium text-foreground">{s.bpm}</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(s.updatedAt).toLocaleDateString("pt-BR")}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhuma música encontrada.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
