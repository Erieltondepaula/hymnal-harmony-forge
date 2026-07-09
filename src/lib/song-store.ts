import { create } from "zustand";

export type Block = {
  id: string;
  type: string; // INTRODUÇÃO, PARTE 1, REFRÃO, PONTE, SOLO, FINAL, etc.
  chords: string[];
  repeat?: string; // "2X", "3X"
  lyric?: string;
  note?: string;
};

export type ShowFlags = {
  key?: boolean;
  bpm?: boolean;
  time?: boolean;
  rhythm?: boolean;
  batida?: boolean;
  capo?: boolean;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  key: string;
  bpm: number;
  bpmEstimated?: boolean;
  time: string; // "4/4"
  rhythm: string; // "Pop Rock"
  rhythmArrows?: string; // ex: "↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑"
  rhythmCounts?: string; // ex: "1 e 2 e 3 e 4 e"
  capo?: number; // 0 = sem capotraste; N = casa N
  show?: ShowFlags;
  favorite?: boolean;
  tags?: string[];
  updatedAt: number;
  createdAt: number;
  blocks: Block[];
  note?: string;
  // Storage invariant flag: when true, `blocks` are stored in `originalKey`
  // and rendered in `key` via smart transposition. New songs are created
  // with this true; legacy songs are migrated lazily by the editor.
  blocksInOriginalKey?: boolean;
};




const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const seed: Song[] = [
  {
    id: "teu-amor-nao-falha",
    title: "Teu Amor Não Falha",
    artist: "Fernandinho",
    originalKey: "Am",
    key: "Am",
    bpm: 74,
    time: "4/4",
    rhythm: "Adoração",
    favorite: true,
    tags: ["Adoração", "Ministração"],
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 3600000,
    blocks: [
      { id: uid(), type: "INTRODUÇÃO", chords: ["Am", "F", "C", "G"], repeat: "2X" },
      { id: uid(), type: "PARTE 1", chords: ["Am", "F", "C", "G", "Am", "F", "C", "G"], lyric: "Nada vai me separar..." },
      { id: uid(), type: "REFRÃO", chords: ["F", "C", "G", "Dm", "F", "C", "G", "Dm"], repeat: "1X", lyric: "Tu és o mesmo pra sempre..." },
      { id: uid(), type: "PARTE 2", chords: ["Am", "F", "C", "G", "Am", "F", "C", "G"], lyric: "Se o vento é forte e profundo o mar..." },
      { id: uid(), type: "REFRÃO", chords: ["F", "C", "G", "Dm", "F", "C", "G", "Dm"], repeat: "2X", lyric: "Tu és o mesmo pra sempre..." },
      { id: uid(), type: "PARTE 3", chords: ["F", "Am", "G", "F", "Am", "G"], lyric: "Tu fazes que tudo..." },
      { id: uid(), type: "REFRÃO", chords: ["F", "C", "G", "Dm", "F", "C", "G", "Dm"], repeat: "1X", lyric: "Tu és o mesmo pra sempre..." },
      { id: uid(), type: "FINAL REFRÃO", chords: ["G", "F", "Am", "G"], repeat: "2X", lyric: "O Teu amor não falha" },
    ],
  },
  {
    id: "que-ele-cresca",
    title: "Que Ele Cresça",
    artist: "Diante do Trono",
    originalKey: "C",
    key: "C",
    bpm: 78,
    time: "4/4",
    rhythm: "Adoração",
    tags: ["Ministração"],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 7200000,
    blocks: [
      { id: uid(), type: "INTRODUÇÃO", chords: ["C", "C9", "C4"], repeat: "2X" },
      { id: uid(), type: "PARTE 1", chords: ["C", "C9", "C4", "Am", "G", "F"], lyric: "Mais de Ti, e menos de mim..." },
      { id: uid(), type: "REFRÃO", chords: ["Dm", "F", "Am", "G"], repeat: "1X", lyric: "Que Ele cresça..." },
      { id: uid(), type: "REFRÃO", chords: ["Dm", "F", "Am", "G"], repeat: "3X", lyric: "Que Ele cresça...", note: "Volta parte 1; na segunda vez o refrão é 3X" },
      { id: uid(), type: "FINAL", chords: ["Dm", "F", "Am", "G"], repeat: "2X" },
    ],
  },
];

type State = {
  songs: Song[];
  history: Record<string, Song[]>; // per-song past
  future: Record<string, Song[]>;
  getSong: (id: string) => Song | undefined;
  createFromSeed: () => string;
  createBlank: () => string;
  createFromParsed: (data: {
    title: string;
    artist?: string;
    originalKey: string;
    bpm: number;
    bpmEstimated?: boolean;
    time?: string;
    rhythm?: string;
    blocks: Array<Omit<Block, "id">>;
  }) => string;
  update: (id: string, patch: Partial<Song>) => void;
  updateBlock: (songId: string, blockId: string, patch: Partial<Block>) => void;
  reorderBlocks: (songId: string, ids: string[]) => void;
  addBlock: (songId: string, block?: Partial<Block>) => void;
  removeBlock: (songId: string, blockId: string) => void;
  duplicateBlock: (songId: string, blockId: string) => void;
  toggleFavorite: (id: string) => void;
  remove: (id: string) => void;
  undo: (id: string) => void;
  redo: (id: string) => void;
};

function pushHistory(state: State, id: string) {
  const song = state.songs.find((s) => s.id === id);
  if (!song) return;
  const past = state.history[id] ?? [];
  state.history[id] = [...past, JSON.parse(JSON.stringify(song))].slice(-100);
  state.future[id] = [];
}

export const useSongStore = create<State>()((set, get) => ({
      songs: [],
      history: {},
      future: {},
      getSong: (id) => get().songs.find((s) => s.id === id),
      createFromSeed: () => {
        const id = uid();
        const now = Date.now();
        const base = seed[0];
        const song: Song = {
          ...JSON.parse(JSON.stringify(base)),
          id,
          title: "Nova Música",
          artist: "",
          createdAt: now,
          updatedAt: now,
          favorite: false,
          blocksInOriginalKey: true,
        };

        set((s) => ({ songs: [song, ...s.songs] }));
        return id;
      },
      createBlank: () => {
        const id = uid();
        const now = Date.now();
        const song: Song = {
          id,
          title: "Nova Música",
          artist: "",
          originalKey: "C",
          key: "C",
          bpm: 80,
          time: "4/4",
          rhythm: "Pop Rock",
          createdAt: now,
          updatedAt: now,
          blocks: [
            { id: uid(), type: "INTRODUÇÃO", chords: ["C", "G", "Am", "F"], repeat: "2X" },
            { id: uid(), type: "PARTE 1", chords: ["C", "G", "Am", "F"], lyric: "..." },
            { id: uid(), type: "REFRÃO", chords: ["F", "C", "G", "Am"], repeat: "2X", lyric: "..." },
          ],
          blocksInOriginalKey: true,
        };

        set((s) => ({ songs: [song, ...s.songs] }));
        return id;
      },
      createFromParsed: (data) => {
        const id = uid();
        const now = Date.now();
        const song: Song = {
          id,
          title: data.title || "Nova Música",
          artist: data.artist ?? "",
          originalKey: data.originalKey,
          key: data.originalKey,
          bpm: data.bpm,
          bpmEstimated: data.bpmEstimated ?? true,
          time: data.time ?? "4/4",
          rhythm: data.rhythm ?? "Pop Rock",
          createdAt: now,
          updatedAt: now,
          blocks: data.blocks.map((b) => ({ ...b, id: uid() })),
          blocksInOriginalKey: true,
        };

        set((s) => ({ songs: [song, ...s.songs] }));
        return id;
      },
      update: (id, patch) =>
        set((state) => {
          pushHistory(state, id);
          return {
            songs: state.songs.map((s) =>
              s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s,
            ),
            history: { ...state.history },
            future: { ...state.future },
          };
        }),
      updateBlock: (songId, blockId, patch) =>
        set((state) => {
          pushHistory(state, songId);
          return {
            songs: state.songs.map((s) =>
              s.id === songId
                ? {
                    ...s,
                    updatedAt: Date.now(),
                    blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
                  }
                : s,
            ),
            history: { ...state.history },
            future: { ...state.future },
          };
        }),
      reorderBlocks: (songId, ids) =>
        set((state) => {
          pushHistory(state, songId);
          return {
            songs: state.songs.map((s) => {
              if (s.id !== songId) return s;
              const map = new Map(s.blocks.map((b) => [b.id, b]));
              return { ...s, updatedAt: Date.now(), blocks: ids.map((i) => map.get(i)!).filter(Boolean) };
            }),
            history: { ...state.history },
            future: { ...state.future },
          };
        }),
      addBlock: (songId, block) =>
        set((state) => {
          pushHistory(state, songId);
          const newBlock: Block = {
            id: uid(),
            type: "NOVA SEÇÃO",
            chords: ["C", "G", "Am", "F"],
            ...block,
          };
          return {
            songs: state.songs.map((s) =>
              s.id === songId ? { ...s, updatedAt: Date.now(), blocks: [...s.blocks, newBlock] } : s,
            ),
            history: { ...state.history },
            future: { ...state.future },
          };
        }),
      removeBlock: (songId, blockId) =>
        set((state) => {
          pushHistory(state, songId);
          return {
            songs: state.songs.map((s) =>
              s.id === songId
                ? { ...s, updatedAt: Date.now(), blocks: s.blocks.filter((b) => b.id !== blockId) }
                : s,
            ),
            history: { ...state.history },
            future: { ...state.future },
          };
        }),
      duplicateBlock: (songId, blockId) =>
        set((state) => {
          pushHistory(state, songId);
          return {
            songs: state.songs.map((s) => {
              if (s.id !== songId) return s;
              const idx = s.blocks.findIndex((b) => b.id === blockId);
              if (idx < 0) return s;
              const clone = { ...s.blocks[idx], id: uid() };
              const blocks = [...s.blocks];
              blocks.splice(idx + 1, 0, clone);
              return { ...s, updatedAt: Date.now(), blocks };
            }),
            history: { ...state.history },
            future: { ...state.future },
          };
        }),
      toggleFavorite: (id) =>
        set((state) => ({
          songs: state.songs.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s)),
        })),
      remove: (id) =>
        set((state) => ({
          songs: state.songs.filter((s) => s.id !== id),
        })),
      undo: (id) =>
        set((state) => {
          const past = state.history[id] ?? [];
          if (past.length === 0) return {};
          const prev = past[past.length - 1];
          const current = state.songs.find((s) => s.id === id);
          const future = state.future[id] ?? [];
          return {
            songs: state.songs.map((s) => (s.id === id ? prev : s)),
            history: { ...state.history, [id]: past.slice(0, -1) },
            future: { ...state.future, [id]: current ? [...future, JSON.parse(JSON.stringify(current))] : future },
          };
        }),
      redo: (id) =>
        set((state) => {
          const future = state.future[id] ?? [];
          if (future.length === 0) return {};
          const next = future[future.length - 1];
          const current = state.songs.find((s) => s.id === id);
          const past = state.history[id] ?? [];
          return {
            songs: state.songs.map((s) => (s.id === id ? next : s)),
            future: { ...state.future, [id]: future.slice(0, -1) },
            history: { ...state.history, [id]: current ? [...past, JSON.parse(JSON.stringify(current))] : past },
          };
        }),
    }));

