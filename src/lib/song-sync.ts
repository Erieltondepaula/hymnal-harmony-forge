import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSongStore, type Song, type Block } from "./song-store";
import { useAuth } from "./auth-context";

type Row = {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  original_key: string;
  song_key: string;
  bpm: number;
  bpm_estimated: boolean;
  time_signature: string;
  rhythm: string;
  favorite: boolean;
  tags: string[];
  blocks: Block[];
  note: string | null;
  created_at: string;
  updated_at: string;
};

function rowToSong(r: Row): Song {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    originalKey: r.original_key,
    key: r.song_key,
    bpm: r.bpm,
    bpmEstimated: r.bpm_estimated,
    time: r.time_signature,
    rhythm: r.rhythm,
    favorite: r.favorite,
    tags: r.tags ?? [],
    blocks: r.blocks ?? [],
    note: r.note ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

function songToRow(s: Song, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    title: s.title,
    artist: s.artist,
    original_key: s.originalKey,
    song_key: s.key,
    bpm: s.bpm,
    bpm_estimated: !!s.bpmEstimated,
    time_signature: s.time,
    rhythm: s.rhythm,
    favorite: !!s.favorite,
    tags: s.tags ?? [],
    blocks: s.blocks,
    note: s.note ?? null,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Convert non-UUID ids (from seed/local) to UUIDs for backend persistence
function ensureUuid(id: string): string {
  if (UUID_RE.test(id)) return id;
  return crypto.randomUUID();
}

export function useSongSync() {
  const { user } = useAuth();
  const lastSyncedRef = useRef<Record<string, number>>({});
  const hydratedRef = useRef<string | null>(null);

  // Hydrate from server on login
  useEffect(() => {
    if (!user) {
      hydratedRef.current = null;
      return;
    }
    if (hydratedRef.current === user.id) return;
    hydratedRef.current = user.id;

    (async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("[song-sync] load", error);
        return;
      }
      const store = useSongStore.getState();
      const remote = (data as Row[]).map(rowToSong);
      const local = store.songs;

      // First-time upload of local (seed / offline) songs
      const remoteIds = new Set(remote.map((s) => s.id));
      const localOnly = local.filter((s) => !remoteIds.has(s.id));

      const toUpload: Song[] = [];
      const idMap: Record<string, string> = {};
      for (const s of localOnly) {
        const newId = ensureUuid(s.id);
        idMap[s.id] = newId;
        toUpload.push({ ...s, id: newId });
      }

      if (toUpload.length > 0) {
        const { error: upErr } = await supabase
          .from("songs")
          .upsert(toUpload.map((s) => songToRow(s, user.id)));
        if (upErr) console.error("[song-sync] initial upload", upErr);
      }

      const merged = [...remote, ...toUpload].sort((a, b) => b.updatedAt - a.updatedAt);
      merged.forEach((s) => (lastSyncedRef.current[s.id] = s.updatedAt));
      useSongStore.setState({ songs: merged, history: {}, future: {} });
    })();
  }, [user]);

  // Watch for local changes and push to server
  useEffect(() => {
    if (!user) return;
    const unsub = useSongStore.subscribe((state, prev) => {
      const changed: Song[] = [];
      const removed: string[] = [];
      const prevMap = new Map(prev.songs.map((s) => [s.id, s]));
      const nextMap = new Map(state.songs.map((s) => [s.id, s]));
      for (const s of state.songs) {
        const p = prevMap.get(s.id);
        if (!p || p.updatedAt !== s.updatedAt) {
          if (lastSyncedRef.current[s.id] !== s.updatedAt) changed.push(s);
        }
      }
      for (const s of prev.songs) if (!nextMap.has(s.id)) removed.push(s.id);

      if (changed.length) {
        supabase
          .from("songs")
          .upsert(changed.map((s) => songToRow(s, user.id)))
          .then(({ error }) => {
            if (error) console.error("[song-sync] push", error);
            else changed.forEach((s) => (lastSyncedRef.current[s.id] = s.updatedAt));
          });
      }
      if (removed.length) {
        supabase
          .from("songs")
          .delete()
          .in("id", removed.filter((id) => UUID_RE.test(id)))
          .then(({ error }) => {
            if (error) console.error("[song-sync] delete", error);
          });
      }
    });
    return () => unsub();
  }, [user]);
}
