import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSongs from "./tools/list-songs";
import getSong from "./tools/get-song";
import createSong from "./tools/create-song";
import deleteSong from "./tools/delete-song";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "mapalouvor-mcp",
  title: "MapaLouvor",
  version: "0.1.0",
  instructions:
    "Tools to browse and manage a user's MapaLouvor songs (mapas musicais). Use list_songs to find items, get_song for full block details, create_song to add a new arrangement, and delete_song to remove one.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSongs, getSong, createSong, deleteSong],
});
