import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, Link2, Loader2, CheckCircle2 } from "lucide-react";
import { useSongStore } from "@/lib/song-store";
import { SongMapRenderer } from "@/components/SongMapRenderer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/novo")({
  component: NewMap,
});

const stages = [
  "Lendo cifra...",
  "Identificando tom...",
  "Analisando estrutura...",
  "Separando partes...",
  "Detectando repetições...",
  "Montando mapa...",
];

function NewMap() {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState(0);
  const [text, setText] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const createFromSeed = useSongStore((s) => s.createFromSeed);
  const navigate = useNavigate();
  const previewSong = useSongStore((s) => s.songs[0]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const runProcess = () => {
    setProcessing(true);
    setStage(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      if (i >= stages.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStage(stages.length);
        setTimeout(() => {
          const id = createFromSeed();
          navigate({ to: "/editor/$id", params: { id } });
        }, 400);
        return;
      }
      setStage(i);
    }, 600);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="h-song">Novo Mapa</h1>
        <p className="text-[15px] text-muted-foreground">
          Envie uma cifra, cole o texto ou arraste um PDF — nós montamos o mapa.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Import column */}
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              runProcess();
            }}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
            style={{ transitionDuration: "180ms" }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div className="mt-4 text-[18px] font-semibold">Arraste a cifra aqui</div>
            <div className="mt-1 text-[14px] text-muted-foreground">
              PDF, DOCX, TXT, PNG, JPG · ou cole com Ctrl + V
            </div>
            <button
              onClick={runProcess}
              className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground transition-all hover:brightness-110"
              style={{ transitionDuration: "180ms" }}
            >
              Selecionar arquivo
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Colar cifra em texto
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Am F C G\nNada vai me separar..."}
              rows={6}
              className="w-full resize-none rounded-lg border border-input bg-background p-3 font-mono text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
            <button
              onClick={runProcess}
              disabled={!text.trim() || processing}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40"
            >
              Gerar mapa
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              Link do Cifra Club
            </div>
            <input
              placeholder="https://www.cifraclub.com.br/..."
              className="w-full rounded-lg border border-input bg-background p-2.5 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </div>

          {processing ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 text-[14px] font-semibold">Processando</div>
              <ul className="space-y-2">
                {stages.map((label, i) => (
                  <li key={label} className="flex items-center gap-2 text-[13px]">
                    {i < stage ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : i === stage ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-border" />
                    )}
                    <span className={cn(i <= stage ? "text-foreground" : "text-muted-foreground")}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (stage / stages.length) * 100)}%`,
                    transitionDuration: "180ms",
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Preview column */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[14px] font-semibold">Pré-visualização</div>
            <div className="text-[12px] text-muted-foreground">Assim ficará o PDF</div>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-lg">
            {previewSong ? <SongMapRenderer song={previewSong} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
