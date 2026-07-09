import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FilePlus2, Upload, Music2, Clock, Star } from "lucide-react";
import { useSongStore } from "@/lib/song-store";
import { usePreferences } from "@/lib/preferences-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)} h atrás`;
  return `${Math.floor(s / 86400)} d atrás`;
}

function Dashboard() {
  const songs = useSongStore((s) => s.songs);
  const createBlank = useSongStore((s) => s.createBlank);
  const navigate = useNavigate();
  const recent = [...songs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="h-display">Olá, João</h1>
        <p className="text-[18px] text-muted-foreground">Vamos montar um novo mapa?</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => {
            const id = createBlank();
            navigate({ to: "/editor/$id", params: { id } });
          }}
          className="group flex items-center gap-5 rounded-2xl border border-border bg-card p-8 text-left transition-all hover:border-primary/50 hover:bg-card/80"
          style={{ transitionDuration: "180ms" }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <FilePlus2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[20px] font-semibold">Novo Mapa</div>
            <div className="text-[14px] text-muted-foreground">Comece do zero em segundos</div>
          </div>
        </button>

        <Link
          to="/novo"
          className="group flex items-center gap-5 rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:bg-card/80"
          style={{ transitionDuration: "180ms" }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[20px] font-semibold">Importar PDF</div>
            <div className="text-[14px] text-muted-foreground">Transforme cifras em mapas</div>
          </div>
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="h-section">Projetos recentes</h2>
          <Link to="/biblioteca" className="text-[14px] text-primary hover:brightness-125">
            Ver biblioteca
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recent.map((s) => (
            <Link
              key={s.id}
              to="/editor/$id"
              params={{ id: s.id }}
              className={cn(
                "group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40",
              )}
              style={{ transitionDuration: "180ms" }}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Music2 className="h-5 w-5" />
                  </div>
                  {s.favorite ? <Star className="h-4 w-4 fill-warning text-warning" /> : null}
                </div>
                <div className="mt-4 truncate text-[18px] font-semibold">{s.title}</div>
                <div className="truncate text-[14px] text-muted-foreground">
                  {s.artist || "—"}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-[13px] text-muted-foreground">
                <div className="flex gap-3">
                  <span>
                    <span className="text-muted-foreground/60">Tom </span>
                    <span className="font-medium text-foreground">{s.key}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground/60">BPM </span>
                    <span className="font-medium text-foreground">{s.bpm}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {timeAgo(s.updatedAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
