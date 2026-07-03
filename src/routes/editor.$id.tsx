import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Download,
  Share2,
  Plus,
  GripVertical,
  Copy,
  Trash2,
  Music2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSongStore, type Block } from "@/lib/song-store";
import { transposeAll } from "@/lib/transpose";
import { SongMapRenderer } from "@/components/SongMapRenderer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/editor/$id")({
  component: Editor,
});

const KEYS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm",
];

const TIME_SIGS = ["2/4", "3/4", "4/4", "5/4", "6/8", "12/8"];

function Editor() {
  const { id } = Route.useParams();
  const song = useSongStore((s) => s.songs.find((x) => x.id === id));
  const update = useSongStore((s) => s.update);
  const updateBlock = useSongStore((s) => s.updateBlock);
  const reorderBlocks = useSongStore((s) => s.reorderBlocks);
  const addBlock = useSongStore((s) => s.addBlock);
  const removeBlock = useSongStore((s) => s.removeBlock);
  const duplicateBlock = useSongStore((s) => s.duplicateBlock);
  const undo = useSongStore((s) => s.undo);
  const redo = useSongStore((s) => s.redo);
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const selected = useMemo(
    () => song?.blocks.find((b) => b.id === selectedId) ?? null,
    [song, selectedId],
  );

  // Undo/redo shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!song) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo(song.id);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        redo(song.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [song, undo, redo]);

  // Auto-save flash
  useEffect(() => {
    if (!song) return;
    setSavedFlash(true);
    const t = setTimeout(() => setSavedFlash(false), 900);
    return () => clearTimeout(t);
  }, [song?.updatedAt]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!song) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Música não encontrada</p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = song.blocks.map((b) => b.id);
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    reorderBlocks(song.id, arrayMove(ids, oldIdx, newIdx));
  };

  const changeKey = (newKey: string) => {
    const newBlocks = transposeAll(song.blocks, song.key, newKey);
    update(song.id, { key: newKey, blocks: newBlocks });
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Music2 className="h-4 w-4" />
          </div>
          <input
            value={song.title}
            onChange={(e) => update(song.id, { title: e.target.value })}
            placeholder="Nome da música"
            className="min-w-0 max-w-[400px] truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-[15px] font-semibold outline-none transition-colors hover:border-border focus:border-primary focus:bg-background"
          />

          <span
            className={cn(
              "ml-2 text-[12px] transition-opacity",
              savedFlash ? "text-success opacity-100" : "text-muted-foreground opacity-60",
            )}
            style={{ transitionDuration: "180ms" }}
          >
            {savedFlash ? "Salvo" : "Auto-salvamento ativo"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarBtn onClick={() => undo(song.id)} title="Desfazer (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => redo(song.id)} title="Refazer (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </ToolbarBtn>
          <div className="mx-2 h-6 w-px bg-border" />
          <ToolbarBtn title="Salvar">
            <Save className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="Compartilhar">
            <Share2 className="h-4 w-4" />
          </ToolbarBtn>
          <button
            onClick={() => window.print()}
            className="ml-2 flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground hover:brightness-110"
            style={{ transitionDuration: "180ms" }}
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="grid flex-1 min-h-0 grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* Blocks panel */}
        <aside className="flex flex-col border-r border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Blocos
            </div>
            <button
              onClick={() => addBlock(song.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Adicionar bloco"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={song.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1">
                  {song.blocks.map((b) => (
                    <SortableBlockRow
                      key={b.id}
                      block={b}
                      selected={selectedId === b.id}
                      onSelect={() => setSelectedId(b.id)}
                      onDuplicate={() => duplicateBlock(song.id, b.id)}
                      onRemove={() => {
                        removeBlock(song.id, b.id);
                        if (selectedId === b.id) setSelectedId(null);
                      }}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        </aside>

        {/* Preview */}
        <main className="overflow-auto bg-[#0b0d12] p-8">
          <SongMapRenderer song={song} />
        </main>

        {/* Properties */}
        <aside className="flex flex-col border-l border-border bg-surface">
          <div className="border-b border-border px-4 py-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            {selected ? "Propriedades do bloco" : "Propriedades da música"}
          </div>
          <div className="flex-1 space-y-5 overflow-auto p-4">
            {!selected ? (
              <>
                <Field label="Título da música">
                  <input
                    value={song.title}
                    onChange={(e) => update(song.id, { title: e.target.value })}
                    placeholder="Ex.: Teu Amor Não Falha"
                    className="input"
                  />
                </Field>
                <Field label="Artista">
                  <input
                    value={song.artist}
                    onChange={(e) => update(song.id, { artist: e.target.value })}
                    placeholder="Ex.: Fernandinho"
                    className="input"
                  />
                </Field>

                <Field label="Tom">
                  <select
                    value={song.key}
                    onChange={(e) => changeKey(e.target.value)}
                    className="input"
                  >
                    {KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="BPM">
                    <input
                      type="number"
                      value={song.bpm}
                      onChange={(e) => update(song.id, { bpm: Number(e.target.value) || 0 })}
                      className="input"
                    />
                  </Field>
                  <Field label="Compasso">
                    <select
                      value={song.time}
                      onChange={(e) => update(song.id, { time: e.target.value })}
                      className="input"
                    >
                      {TIME_SIGS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Ritmo / Estilo">
                  <input
                    value={song.rhythm}
                    onChange={(e) => update(song.id, { rhythm: e.target.value })}
                    placeholder="Ex.: Adoração, Pop Rock, Balada"
                    className="input"
                  />
                </Field>

                <RhythmPatternEditor
                  arrows={song.rhythmArrows ?? ""}
                  counts={song.rhythmCounts ?? ""}
                  onChange={(patch) => update(song.id, patch)}
                />


                <Field label="Observações">
                  <textarea
                    rows={4}
                    value={song.note ?? ""}
                    onChange={(e) => update(song.id, { note: e.target.value })}
                    className="input resize-none"
                  />
                </Field>
              </>
            ) : (
              <BlockProps
                block={selected}
                onChange={(patch) => updateBlock(song.id, selected.id, patch)}
                onDeselect={() => setSelectedId(null)}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Status bar */}
      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-surface px-4 text-[12px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{song.blocks.length} blocos</span>
          <span>
            Tom <span className="text-foreground">{song.key}</span>
          </span>
          <span>
            BPM <span className="text-foreground">{song.bpm}</span>
          </span>
        </div>
        <div>MapaLouvor</div>
      </footer>

      <style>{`
        .input {
          width: 100%;
          background: var(--background);
          border: 1px solid var(--input);
          color: var(--foreground);
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 13px;
          outline: none;
          transition: border-color 180ms;
        }
        .input:focus { border-color: var(--primary); }
      `}</style>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
      style={{ transitionDuration: "180ms" }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <div className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

function SortableBlockRow({
  block,
  selected,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1 rounded-lg border border-transparent px-2 py-2 text-[13px]",
        selected ? "border-primary/40 bg-primary/10" : "hover:bg-accent",
        isDragging && "opacity-60",
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/60 hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="truncate font-semibold uppercase">{block.type}</div>
        <div className="truncate text-[11px] text-muted-foreground">
          {block.chords.join(" · ")}
        </div>
      </div>
      {block.repeat ? (
        <span className="rounded bg-border/50 px-1.5 py-0.5 text-[10px] font-semibold">
          {block.repeat}
        </span>
      ) : null}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function BlockProps({
  block,
  onChange,
  onDeselect,
}: {
  block: Block;
  onChange: (patch: Partial<Block>) => void;
  onDeselect: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onDeselect}
        className="text-[12px] text-muted-foreground hover:text-foreground"
      >
        ← Propriedades da música
      </button>
      <Field label="Título">
        <input
          value={block.type}
          onChange={(e) => onChange({ type: e.target.value.toUpperCase() })}
          className="input"
        />
      </Field>
      <Field label="Acordes (separados por espaço)">
        <input
          value={block.chords.join(" ")}
          onChange={(e) => onChange({ chords: e.target.value.split(/\s+/).filter(Boolean) })}
          className="input font-mono"
        />
      </Field>
      <Field label="Repetição">
        <input
          value={block.repeat ?? ""}
          onChange={(e) => onChange({ repeat: e.target.value })}
          placeholder="ex: 2X"
          className="input"
        />
      </Field>
      <Field label="Frase">
        <input
          value={block.lyric ?? ""}
          onChange={(e) => onChange({ lyric: e.target.value })}
          className="input"
        />
      </Field>
      <Field label="Observações">
        <textarea
          rows={3}
          value={block.note ?? ""}
          onChange={(e) => onChange({ note: e.target.value })}
          className="input resize-none"
        />
      </Field>
    </div>
  );
}
