import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  url: z.string().url(),
});

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function stripTags(html: string) {
  return decodeEntities(html.replace(/<[^>]+>/g, ""));
}

function extractMeta(html: string, prop: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : undefined;
}

export const fetchCifraFromUrl = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const url = data.url.trim();

    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
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
      const div = html.match(/<div[^>]+class=["'][^"']*cifra[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (div) cifra = stripTags(div[1]).trim();
    }

    if (!cifra || cifra.length < 20) {
      throw new Error(
        "Não encontrei a cifra nesta página. Copie e cole o texto manualmente.",
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
