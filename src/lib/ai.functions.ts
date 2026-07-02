import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const BlockSchema = z.object({
  type: z.string().describe("Nome da seção em MAIÚSCULAS: INTRODUÇÃO, PARTE 1, PARTE 2, REFRÃO, PONTE, SOLO, FINAL, etc."),
  chords: z.array(z.string()).describe("Sequência de acordes na ordem tocada, ex.: ['Am','F','C','G']"),
  repeat: z.string().optional().describe("Número de vezes, ex.: '2X', '3X'. Omita se for 1x."),
  lyric: z.string().optional().describe("Primeira linha (ou trecho curto) da letra desta seção, para identificação."),
  note: z.string().optional().describe("Observação opcional (ex.: 'volta para parte 1')."),
});

const SongSchema = z.object({
  title: z.string(),
  artist: z.string().default(""),
  originalKey: z.string().describe("Tom original detectado, ex.: 'Am', 'C', 'G#m'"),
  bpm: z.number().int().min(40).max(240).describe("BPM estimado"),
  bpmEstimated: z.boolean().default(true),
  time: z.string().default("4/4"),
  rhythm: z.string().describe("Estilo/ritmo: Adoração, Pop Rock, Balada, etc."),
  blocks: z.array(BlockSchema).min(1),
});

const ParseInput = z.object({
  text: z.string().min(1).max(20000),
  titleHint: z.string().optional(),
  artistHint: z.string().optional(),
});

const SYSTEM = `Você é um analisador musical especialista em cifras de louvor em português.
Receba uma cifra bruta (com acordes e letra) e devolva um MAPA MUSICAL compacto em JSON.

Regras:
- Identifique o TOM original com precisão (analise o acorde final/central e a tonalidade da harmonia).
- Estime o BPM se não estiver explícito.
- Divida em blocos: INTRODUÇÃO, PARTE 1, PARTE 2, REFRÃO, PONTE, SOLO, FINAL, FINAL REFRÃO.
- Consolide repetições: se a mesma seção se repete, use 'repeat' como '2X', '3X'.
- Acordes: preserve formato original (Am, F, C/E, G7M, Dm9, etc.), sem espaços.
- Letra: inclua apenas a PRIMEIRA linha de cada seção como 'lyric' (identificação visual).
- Retorne SEM comentários, apenas o JSON estruturado.`;

export const parseCifra = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ParseInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = [
      data.titleHint ? `Título fornecido pelo usuário: ${data.titleHint}` : null,
      data.artistHint ? `Artista fornecido: ${data.artistHint}` : null,
      "",
      "Cifra:",
      data.text,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: SYSTEM,
        prompt,
        output: Output.object({ schema: SongSchema }),
      });
      return output;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("Muitas requisições. Tente novamente em instantes.");
      if (msg.includes("402")) throw new Error("Créditos de IA esgotados. Adicione créditos ao workspace.");
      throw new Error(`Falha ao analisar cifra: ${msg}`);
    }
  });
