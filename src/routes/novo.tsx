import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  Sparkles,
  Link2,
  Download,
  XCircle,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useSongStore, type Song, type SongStructureEntry } from "@/lib/song-store";
import { SongMapRenderer } from "@/components/SongMapRenderer";
import { parseCifra } from "@/lib/ai.functions";
import { fetchCifraFromUrl } from "@/lib/fetch-cifra.functions";
import { extractTextFromFile } from "@/lib/file-extract";
import { parseCifraLocally, type ParsedCifraSong } from "@/lib/cifra-parser";
import { runImportPipeline, type ImportResult, type RepetitionSuggestion } from "@/lib/import";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/novo")({
  component: NewMap,
});

const stages = [
  "Lendo cifra...",
  "Identificando tom...",
  "Analisando estrutura...",
  "Detectando blocos...",
  "Encontrando repetições...",
  "Otimizando layout...",
];

const samplePreview = `Tom: G

[Intro] G  C/G  Em7  G/B  C9

[Primeira Parte]
G        D/F#       Em7
Minha vida está em Ti

[Refrão]
C9       G/B      Am7      D
Teu amor me encontrou`;

function toPreviewSong(parsed: ParsedCifraSong, id = "preview-novo"): Song {
  return {
    id,
    title: parsed.title || "Nova Música",
    artist: parsed.artist || "",
    originalKey: parsed.originalKey || "C",
    key: parsed.originalKey || "C",
    bpm: parsed.bpm || 72,
    bpmEstimated: parsed.bpmEstimated,
    time: parsed.time || "4/4",
    rhythm: parsed.rhythm || "Adoração",
    createdAt: 0,
    updatedAt: 0,
    blocksInOriginalKey: true,
    blocks: parsed.blocks.map((block, index) => ({
      id: `${id}-${index}`,
      type: block.type,
      chords: block.chords,
      repeat: block.repeat ?? undefined,
      lyric: block.lyric ?? undefined,
      note: block.note ?? undefined,
    })),
  };
}

const defaultPreviewSong = toPreviewSong(
  parseCifraLocally(samplePreview, { titleHint: "Pré-visualização", artistHint: "MapaLouvor" }),
  "preview-default",
);

function importResultToPreviewSong(res: ImportResult, base?: { title: string; artist: string }): Song {
  const structure: SongStructureEntry[] = res.view.blocks.map((v) =>
    v.kind === "ref"
      ? { kind: "ref", structureId: v.structureId, targetType: v.targetType, label: v.label }
      : { kind: "content", sourceIndex: v.sourceIndex, structureId: v.structureId },
  );
  return {
    id: "preview-analysis",
    title: base?.title || res.source.title,
    artist: base?.artist ?? res.source.artist,
    originalKey: res.source.originalKey,
    key: res.source.originalKey,
    bpm: res.source.bpm,
    bpmEstimated: res.source.bpmEstimated,
    time: res.source.time,
    rhythm: res.source.rhythm,
    createdAt: 0,
    updatedAt: 0,
    blocksInOriginalKey: true,
    blocks: res.source.blocks.map((b, i) => ({
      id: `preview-analysis-${i}`,
      type: b.type,
      chords: b.chords,
      repeat: b.repeat ?? undefined,
      lyric: b.lyric ?? undefined,
      note: b.note ?? undefined,
    })),
    structure,
  };
}

function NewMap() {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState(0);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [url, setUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Record<number, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const createFromParsed = useSongStore((s) => s.createFromParsed);
  const navigate = useNavigate();
  const storedPreviewSong = useSongStore((s) => s.songs[0]);
  const runParse = useServerFn(parseCifra);
  const runFetchUrl = useServerFn(fetchCifraFromUrl);

  const previewSong = useMemo(() => {
    if (result) return importResultToPreviewSong(result, { title, artist });
    if (!text.trim()) return storedPreviewSong ?? defaultPreviewSong;
    const parsed = parseCifraLocally(text, { titleHint: title, artistHint: artist });
    return parsed.blocks.length ? toPreviewSong(parsed) : storedPreviewSong ?? defaultPreviewSong;
  }, [artist, result, storedPreviewSong, text, title]);

  const runAnalysisWith = async (opts: {
    text: string;
    titleHint?: string;
    artistHint?: string;
  }) => {
    setProcessing(true);
    setResult(null);
    setAcceptedSuggestions({});
    startStageAnimation();
    try {
      const res = await runImportPipeline({
        text: opts.text.trim(),
        titleHint: opts.titleHint?.trim() || undefined,
        artistHint: opts.artistHint?.trim() || undefined,
        runParse,
      });
      stopStageAnimation();
      setStage(stages.length);
      if (!title.trim() && res.source.title) setTitle(res.source.title);
      if (!artist.trim() && res.source.artist) setArtist(res.source.artist);
      setResult(res);
      toast.success("Análise concluída! Confira o mapa antes de salvar.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao analisar cifra";
      toast.error(msg);
    } finally {
      stopStageAnimation();
      setProcessing(false);
    }
  };

  const confirmAndSave = () => {
    if (!result) return;
    const finalTitle = title.trim() || result.source.title || "Nova Música";
    const finalArtist = artist.trim() || result.source.artist || "";

    // Apply user-accepted suggestions (85–94%) to the ViewModel.
    const structure: SongStructureEntry[] = result.view.blocks.map((v) =>
      v.kind === "ref"
        ? { kind: "ref", structureId: v.structureId, targetType: v.targetType, label: v.label }
        : { kind: "content", sourceIndex: v.sourceIndex, structureId: v.structureId },
    );
    // Accepted suggestions turn a content entry into a ref to the target.
    const acceptedIndexes = new Set(
      Object.entries(acceptedSuggestions)
        .filter(([, v]) => v)
        .map(([k]) => Number(k)),
    );
    if (acceptedIndexes.size) {
      for (const sug of result.analysis.suggestions) {
        if (!acceptedIndexes.has(sug.sourceIndex)) continue;
        const idx = structure.findIndex(
          (e) => e.kind === "content" && e.sourceIndex === sug.sourceIndex,
        );
        if (idx >= 0) {
          structure[idx] = {
            kind: "ref",
            structureId: sug.targetStructureId,
            targetType: sug.targetType,
            label: `↺ Voltar ao ${sug.targetType}`,
          };
        }
      }
    }

    const id = createFromParsed({
      title: finalTitle,
      artist: finalArtist,
      originalKey: result.source.originalKey,
      bpm: result.source.bpm,
      bpmEstimated: result.source.bpmEstimated,
      time: result.source.time,
      rhythm: result.source.rhythm,
      blocks: result.source.blocks.map((b) => ({
        type: b.type,
        chords: b.chords,
        repeat: b.repeat ?? undefined,
        lyric: b.lyric ?? undefined,
        note: b.note ?? undefined,
      })),
      structure,
      derived: result.analysis.derived,
    });
    toast.success("Mapa salvo!");
    setTimeout(() => navigate({ to: "/editor/$id", params: { id } }), 200);
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
      const fetched = await runFetchUrl({ data: { url: value } });
      setText(fetched.text);
      const nextTitle = title.trim() || fetched.title || "";
      const nextArtist = artist.trim() || fetched.artist || "";
      if (!title.trim() && fetched.title) setTitle(fetched.title);
      if (!artist.trim() && fetched.artist) setArtist(fetched.artist);
      toast.success("Cifra importada! Analisando estrutura...");
      setFetchingUrl(false);
      await runAnalysisWith({
        text: fetched.text,
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

  const handleFile = async (file: File) => {
    if (processing) return;
    try {
      toast.loading("Lendo arquivo...", { id: "file-read" });
      const content = await extractTextFromFile(file);
      toast.dismiss("file-read");
      if (!content.trim()) {
        toast.error("Arquivo vazio ou sem texto legível.");
        return;
      }
      setText(content);
      toast.success(`Arquivo carregado: ${file.name}. Analisando...`);
      await runAnalysisWith({ text: content, titleHint: title, artistHint: artist });
    } catch (err) {
      toast.dismiss("file-read");
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao ler arquivo: ${msg}`);
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
    }, 550);
  };

  const stopStageAnimation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const runProcess = async () => {
    if (!text.trim()) {
      toast.error("Cole uma cifra para gerar o mapa.");
      return;
    }
    await runAnalysisWith({ text, titleHint: title, artistHint: artist });
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="h-song">Novo Mapa</h1>
        <p className="text-[15px] text-muted-foreground">
          Envie uma cifra, cole o texto ou arraste PDF/DOCX/TXT/RTF — a IA analisa a estrutura,
          detecta repetições e monta o mapa otimizado.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Import column */}
        <div className="space-y-4">
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
              disabled={fetchingUrl || !url.trim() || processing}
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
          </div>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (!file) return;
              await handleFile(file);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/40",
            )}
            style={{ transitionDuration: "180ms" }}
          >
            <input
              type="file"
              accept=".txt,.pdf,.docx,.md,.rtf,text/plain,text/markdown,application/pdf,application/rtf,text/rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.currentTarget.value = "";
                await handleFile(file);
              }}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div className="mt-3 text-[15px] font-semibold">Arraste um arquivo PDF, DOCX, TXT, MD ou RTF</div>
            <div className="mt-1 text-[13px] text-muted-foreground">
              Ou clique para escolher — também pode colar o texto abaixo
            </div>
          </label>

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
                  Analisando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Analisar e gerar mapa
                </>
              )}
            </button>
          </div>

          {processing ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 text-[14px] font-semibold">Analisando estrutura</div>
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
            </div>
          ) : null}
        </div>

        {/* Preview column */}
        <div className="space-y-4">
          {result ? (
            <QualityCard
              result={result}
              accepted={acceptedSuggestions}
              onAccept={(idx, v) =>
                setAcceptedSuggestions((prev) => ({ ...prev, [idx]: v }))
              }
              onConfirm={confirmAndSave}
            />
          ) : null}

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[14px] font-semibold">Pré-visualização</div>
              <div className="text-[12px] text-muted-foreground">
                {result ? "Mapa otimizado" : "Exemplo do formato final"}
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-lg">
              <SongMapRenderer song={previewSong} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QualityCard({
  result,
  accepted,
  onAccept,
  onConfirm,
}: {
  result: ImportResult;
  accepted: Record<number, boolean>;
  onAccept: (sourceIndex: number, value: boolean) => void;
  onConfirm: () => void;
}) {
  const { score, analysis } = result;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[14px] font-semibold">
          🧠 Estrutura reconhecida
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[12px] text-muted-foreground">Qualidade</div>
          <div
            className={cn(
              "rounded-md px-2 py-0.5 text-[13px] font-bold",
              score.overall >= 80
                ? "bg-success/15 text-success"
                : score.overall >= 60
                  ? "bg-amber-500/15 text-amber-700"
                  : "bg-destructive/15 text-destructive",
            )}
          >
            {score.overall}%
          </div>
        </div>
      </div>

      <ul className="space-y-1.5 text-[13px]">
        {score.checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2">
            {c.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
            <span className={cn(c.ok ? "text-foreground" : "text-muted-foreground")}>
              {c.label}
              {c.detail ? <span className="text-muted-foreground"> — {c.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>

      {analysis.savingsPct > 0 ? (
        <div className="mt-3 text-[12px] text-muted-foreground">
          Economia estimada de <span className="font-semibold text-foreground">{analysis.savingsPct}%</span> reutilizando blocos.
        </div>
      ) : null}

      {analysis.suggestions.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sugestões de reutilização
          </div>
          {analysis.suggestions.map((s) => (
            <SuggestionRow
              key={s.sourceIndex}
              s={s}
              value={accepted[s.sourceIndex] ?? false}
              onChange={(v) => onAccept(s.sourceIndex, v)}
            />
          ))}
        </div>
      ) : null}

      <button
        onClick={onConfirm}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[14px] font-semibold text-primary-foreground transition-all hover:brightness-110"
      >
        <CheckCircle2 className="h-4 w-4" />
        Confirmar e salvar
      </button>
    </div>
  );
}

function SuggestionRow({
  s,
  value,
  onChange,
}: {
  s: RepetitionSuggestion;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
      <div className="text-[13px]">
        Bloco parecido com <span className="font-semibold">{s.targetType}</span>{" "}
        <span className="text-muted-foreground">
          ({Math.round(s.similarity * 100)}% de similaridade)
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(true)}
          className={cn(
            "rounded-md border px-3 py-1 text-[12px] font-semibold",
            value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-accent",
          )}
        >
          Sim
        </button>
        <button
          onClick={() => onChange(false)}
          className={cn(
            "rounded-md border px-3 py-1 text-[12px] font-semibold",
            !value
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-border bg-background hover:bg-accent",
          )}
        >
          Não
        </button>
      </div>
    </div>
  );
}
