import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  url: z.string().url(),
});

export const fetchCifraFromUrl = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const { decodeEntities, extractMeta, stripTags } = await import("./fetch-cifra-utils");
    const url = data.url.trim();

    let html: string;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      }).finally(() => clearTimeout(timer));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/abort|aborted|AbortError/i.test(msg)) {
        throw new Error("O site demorou muito para responder. Tente novamente ou cole a cifra manualmente.");
      }
      throw new Error(`Não foi possível acessar o link: ${msg}`);
    }

    // Cifra Club: cifra vive em <pre>...</pre>. Alguns templates dividem em
    // vários <pre> (um por seção) — juntamos todos para não perder trechos.
    const preMatches = Array.from(html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi));
    let cifra = "";
    if (preMatches.length) {
      cifra = preMatches
        .map((m) => stripTags(m[1]).trim())
        .filter((t) => t.length > 0)
        .join("\n\n")
        .trim();
    }
    // Fallback: div com classe "cifra_cnt" ou similar
    if (!cifra || cifra.length < 20) {
      const div =
        html.match(/<div[^>]+class=["'][^"']*cifra_cnt[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ??
        html.match(/<div[^>]+class=["'][^"']*cifra[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ??
        html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      if (div) cifra = stripTags(div[1]).trim();
    }

    if (!cifra || cifra.length < 20) {
      throw new Error(
        "Não encontrei a cifra nesse link. Confira se é a página da música no Cifra Club ou cole a cifra manualmente.",
      );
    }

    // Título/artista via OpenGraph ou <title>
    let title =
      extractMeta(html, "og:title") ??
      extractMeta(html, "twitter:title") ??
      (html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "").trim();
    let artist = "";

    // Cifra Club title format: "Nome da Música - Artista - Cifra Club"
    if (title) {
      title = decodeEntities(title).replace(/\s*-\s*Cifra Club\s*$/i, "").trim();
      const parts = title.split(/\s+-\s+/);
      if (parts.length >= 2) {
        title = parts[0].trim();
        artist = parts.slice(1).join(" - ").trim();
      }
    }

    return { text: cifra, title, artist };
  });
