import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const ParseInput = z.object({
  text: z.string().min(1).max(20000),
  titleHint: z.string().optional(),
  artistHint: z.string().optional(),
});

export const parseCifra = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ParseInput.parse(input))
  .handler(async ({ data }) => {
    const { extractJsonObject, normalizeSongMap, parseCifraLocally } = await import("./cifra-parser");
    const fallback = parseCifraLocally(data.text, {
      titleHint: data.titleHint,
      artistHint: data.artistHint,
    });

    if (!fallback.blocks.length) {
      throw new Error("Não encontrei acordes no texto. Verifique se a cifra foi copiada corretamente.");
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) return fallback;

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const system = `Você é um analisador musical especialista em cifras de louvor em português.
Receba uma cifra bruta (com acordes e letra) e devolva um MAPA MUSICAL compacto em JSON.
Retorne SEM comentários, apenas JSON válido com: title, artist, originalKey, bpm, bpmEstimated, time, rhythm, blocks.
Cada bloco deve ter: type, chords(array de strings), repeat(null ou string), lyric(null ou string), note(null ou string).`;

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
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt,
        temperature: 0,
        maxOutputTokens: 3500,
      });
      return normalizeSongMap(extractJsonObject(text), fallback);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("Muitas requisições. Tente novamente em instantes.");
      if (msg.includes("402")) throw new Error("Créditos de IA esgotados. Adicione créditos ao workspace.");
      return fallback;
    }
  });
