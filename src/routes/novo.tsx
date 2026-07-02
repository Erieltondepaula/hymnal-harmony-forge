import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, Loader2, CheckCircle2, Sparkles, Link2, Download } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useSongStore } from "@/lib/song-store";
import { SongMapRenderer } from "@/components/SongMapRenderer";
import { parseCifra } from "@/lib/ai.functions";
import { fetchCifraFromUrl } from "@/lib/fetch-cifra.functions";
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
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const createFromParsed = useSongStore((s) => s.createFromParsed);
  const navigate = useNavigate();
  const previewSong = useSongStore((s) => s.songs[0]);
  const runParse = useServerFn(parseCifra);
  const runFetchUrl = useServerFn(fetchCifraFromUrl);

  const runProcessWith = async (opts: {
    text: string;
    titleHint?: string;
    artistHint?: string;
  }) => {
    setProcessing(true);
    startStageAnimation();
    try {
      const parsed = await runParse({
        data: {
          text: opts.text.trim(),
          titleHint: opts.titleHint?.trim() || undefined,
          artistHint: opts.artistHint?.trim() || undefined,
        },
      });
      stopStageAnimation();
      setStage(stages.length);
      // Atualiza campos visíveis com o que a IA detectou
      if (!title.trim() && parsed.title) setTitle(parsed.title);
      if (!artist.trim() && parsed.artist) setArtist(parsed.artist);
      const finalTitle = (opts.titleHint || title).trim() || parsed.title || "Nova Música";
      const finalArtist = (opts.artistHint || artist).trim() || parsed.artist || "";
      const id = createFromParsed({
        title: finalTitle,
        artist: finalArtist,
        originalKey: parsed.originalKey,
        bpm: parsed.bpm,
        bpmEstimated: parsed.bpmEstimated,
        time: parsed.time,
        rhythm: parsed.rhythm,
        blocks: parsed.blocks.map((b) => ({
          type: b.type,
          chords: b.chords,
          repeat: b.repeat ?? undefined,
          lyric: b.lyric ?? undefined,
          note: b.note ?? undefined,
        })),
      });
      toast.success("Mapa gerado com sucesso!");
      setTimeout(() => navigate({ to: "/editor/$id", params: { id } }), 300);
    } catch (err) {
      stopStageAnimation();
      setProcessing(false);
      const msg = err instanceof Error ? err.message : "Erro ao processar cifra";
      toast.error(msg);
    }
  };

  const importFromUrl = async () => {
    const value = url.trim();
    if (!value) {
      toast.error("Cole o link da música do Cifra Club.");
      return;
    }
    try {
      new URL(value);
    } catch {
      toast.error("Link inválido.");
      return;
    }
    setFetchingUrl(true);
    try {
      const result = await runFetchUrl({ data: { url: value } });
      setText(result.text);
      const nextTitle = title.trim() || result.title || "";
      const nextArtist = artist.trim() || result.artist || "";
      if (!title.trim() && result.title) setTitle(result.title);
      if (!artist.trim() && result.artist) setArtist(result.artist);
      toast.success("Cifra importada! Analisando com IA...");
      setFetchingUrl(false);
      // Encadeia análise da IA automaticamente
      await runProcessWith({
        text: result.text,
        titleHint: nextTitle,
        artistHint: nextArtist,
      });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao importar link";
      toast.error(msg);
    } finally {
      setFetchingUrl(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startStageAnimation = () => {
    setStage(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      if (i >= stages.length - 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStage(stages.length - 1);
        return;
      }
      setStage(i);
    }, 700);
  };

  const stopStageAnimation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const runProcess = async () => {
    if (!text.trim()) {
      toast.error("Cole uma cifra para gerar o mapa.");
      return;
    }
    setProcessing(true);
    startStageAnimation();
    try {
      const parsed = await runParse({
        data: { text: text.trim(), titleHint: title || undefined, artistHint: artist || undefined },
      });
      stopStageAnimation();
      setStage(stages.length);
      const finalTitle = title.trim() || parsed.title || "Nova Música";
      const id = createFromParsed({
        title: finalTitle,
        artist: artist.trim() || parsed.artist,
        originalKey: parsed.originalKey,
        bpm: parsed.bpm,
        bpmEstimated: parsed.bpmEstimated,
        time: parsed.time,
        rhythm: parsed.rhythm,
        blocks: parsed.blocks.map((b) => ({
          type: b.type,
          chords: b.chords,
          repeat: b.repeat ?? undefined,
          lyric: b.lyric ?? undefined,
          note: b.note ?? undefined,
        })),
      });
      toast.success("Mapa gerado com sucesso!");
      setTimeout(() => navigate({ to: "/editor/$id", params: { id } }), 300);
    } catch (err) {
      stopStageAnimation();
      setProcessing(false);
      const msg = err instanceof Error ? err.message : "Erro ao processar cifra";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="h-song">Novo Mapa</h1>
        <p className="text-[15px] text-muted-foreground">
          Envie uma cifra, cole o texto ou arraste um PDF — a IA monta o mapa.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Import column */}
        <div className="space-y-4">
          {/* Song identification */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Identificação da música
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                  Nome da música <span className="text-primary">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Teu Amor Não Falha"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-[14px] outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                  Artista / Ministério
                </label>
                <input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ex.: Fernandinho"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-[14px] outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Import from URL (Cifra Club) */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
              <Link2 className="h-4 w-4 text-primary" />
              Importar do Cifra Club
            </div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
              Link da música
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !fetchingUrl) importFromUrl();
              }}
              placeholder="https://www.cifraclub.com.br/..."
              className="w-full rounded-lg border border-input bg-background p-2.5 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
            <button
              onClick={importFromUrl}
              disabled={fetchingUrl || !url.trim()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-[14px] font-semibold text-primary transition-all hover:bg-primary/20 disabled:opacity-40"
            >
              {fetchingUrl ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando cifra...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Importar do link
                </>
              )}
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              A cifra será baixada automaticamente. Depois clique em "Gerar mapa com IA".
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith("text/")) {
                const content = await file.text();
                setText(content);
                toast.success(`Arquivo carregado: ${file.name}`);
              } else if (file) {
                toast.info("Para PDF/imagem, cole o texto da cifra abaixo.");
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
            style={{ transitionDuration: "180ms" }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="mt-3 text-[15px] font-semibold">Arraste um arquivo .txt</div>
            <div className="mt-1 text-[13px] text-muted-foreground">
              Ou cole o texto da cifra no campo abaixo
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Cifra
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Am           F           C           G\nNada vai me separar do Teu amor\n..."}
              rows={10}
              className="w-full resize-none rounded-lg border border-input bg-background p-3 font-mono text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
            <button
              onClick={runProcess}
              disabled={!text.trim() || processing}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[14px] font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-40"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar mapa com IA
                </>
              )}
            </button>
          </div>

          {processing ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 text-[14px] font-semibold">Processando com IA</div>
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
            <div className="text-[12px] text-muted-foreground">Exemplo do formato final</div>
          </div>
          <div className="max-h-[70vh] overflow-auto rounded-lg">
            {previewSong ? <SongMapRenderer song={previewSong} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
