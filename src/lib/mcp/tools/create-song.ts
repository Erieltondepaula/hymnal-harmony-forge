import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const BlockSchema = z.object({
  type: z.string().describe("Section name (e.g. INTRODUÇÃO, PARTE 1, REFRÃO)."),
  chords: z.array(z.string()).describe("Ordered chords for this section."),
  repeat: z.string().nullable().optional(),
  lyric: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export default defineTool({
  name: "create_song",
  title: "Create song",
  description:
    "Creates a new song (mapa musical) for the signed-in user with title, artist, key, BPM and blocks.",
  inputSchema: {
    title: z.string().min(1),
    artist: z.string().optional(),
    originalKey: z.string().describe("Original key, e.g. 'Am', 'C', 'G'."),
    bpm: z.number().int().min(40).max(240),
    time: z.string().optional().describe("Time signature, e.g. '4/4'."),
    rhythm: z.string().optional().describe("Style/rhythm, e.g. 'Adoração', 'Pop Rock'."),
    tags: z.array(z.string()).optional(),
    blocks: z.array(BlockSchema),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const id = crypto.randomUUID();
    const blocks = input.blocks.map((b) => ({ ...b, id: crypto.randomUUID() }));
    const row = {
      id,
      user_id: ctx.getUserId(),
      title: input.title,
      artist: input.artist ?? "",
      original_key: input.originalKey,
      song_key: input.originalKey,
      bpm: input.bpm,
      bpm_estimated: false,
      time_signature: input.time ?? "4/4",
      rhythm: input.rhythm ?? "Pop Rock",
      favorite: false,
      tags: input.tags ?? [],
      blocks,
    };
    const { data, error } = await supabaseForUser(ctx)
      .from("songs")
      .insert(row)
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created song ${data.id}` }],
      structuredContent: { song: data },
    };
  },
});
