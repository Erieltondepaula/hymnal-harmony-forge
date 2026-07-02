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
            "Mozilla/5.0 (compatible; MapaLouvorBot/1.0; +https://lovable.dev)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Não foi possível acessar o link: ${msg}`);
    }

    // Cifra Club: cifra vive em <pre>...</pre>. Fallback: primeiro <pre> da página.
    const preMatches = Array.from(html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi));
    let cifra = "";
    if (preMatches.length) {
      // pega o maior <pre> (a cifra costuma ser o maior bloco)
      preMatches.sort((a, b) => b[1].length - a[1].length);
      cifra = stripTags(preMatches[0][1]).trim();
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
