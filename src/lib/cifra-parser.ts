export type ParsedCifraBlock = {
  type: string;
  chords: string[];
  repeat?: string | null;
  lyric?: string | null;
  note?: string | null;
};

export type ParsedCifraSong = {
  title: string;
  artist: string;
  originalKey: string;
  bpm: number;
  bpmEstimated: boolean;
  time: string;
  rhythm: string;
  blocks: ParsedCifraBlock[];
};

const KEY_RE = /^[A-G](?:#|b)?m?$/;

function removeAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeAccidentals(value: string) {
  return value.replace(/♯/g, "#").replace(/♭/g, "b").replace(/º/g, "°");
}

function cleanToken(token: string) {
  return normalizeAccidentals(token)
    .replace(/^[|:;,.()\[\]{}]+|[|:;,.()\[\]{}]+$/g, "")
    .trim();
}

function isChordToken(token: string) {
  const value = cleanToken(token);
  if (!value || value === "N.C" || value === "N.C.") return false;
  return /^[A-G](?:#|b)?(?:(?:m|M|maj|min|dim|aug|sus|add|°|Δ)?[0-9A-Za-z]*(?:\([^)]*\))?)*(?:\/[A-G](?:#|b)?)?$/.test(
    value,
  );
}

export function splitChords(value: string): string[] {
  return normalizeAccidentals(value)
    .replace(/[|,;]/g, " ")
    .split(/\s+/)
    .map(cleanToken)
    .filter(isChordToken);
}

function isChordLine(line: string) {
  const withoutSection = line.replace(/^\s*\[[^\]]+\]\s*/, "").trim();
  if (!withoutSection) return false;
  const tokens = withoutSection
    .replace(/[|,;]/g, " ")
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean);
  if (!tokens.length) return false;
  const chords = tokens.filter(isChordToken);
  if (!chords.length) return false;
  return chords.length / tokens.length >= 0.65 || (tokens.length <= 3 && chords.length === tokens.length);
}

function sectionName(raw: string, index: number) {
  const clean = removeAccents(raw)
    .replace(/\(?\b\d+\s*x\b\)?/gi, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (/intro|entrada/.test(clean)) return "INTRODUÇÃO";
  if (/pre\s*ref|pre\s*chorus|pre\s*coro/.test(clean)) return "PRÉ-REFRÃO";
  if (/refrao|chorus|coro/.test(clean)) return "REFRÃO";
  if (/ponte|bridge/.test(clean)) return "PONTE";
  if (/solo/.test(clean)) return "SOLO";
  if (/interludio|interlude/.test(clean)) return "INTERLÚDIO";
  if (/final|fim|outro/.test(clean)) return "FINAL";
  if (/primeir|parte\s*1|verso\s*1|verse\s*1/.test(clean)) return "PARTE 1";
  if (/segund|parte\s*2|verso\s*2|verse\s*2/.test(clean)) return "PARTE 2";
  if (/terceir|parte\s*3|verso\s*3|verse\s*3/.test(clean)) return "PARTE 3";
  if (/quart|parte\s*4|verso\s*4|verse\s*4/.test(clean)) return "PARTE 4";
  if (/verso|verse|estrofe|parte/.test(clean)) return `PARTE ${Math.max(1, index)}`;
  return raw.trim().toUpperCase() || `PARTE ${Math.max(1, index)}`;
}

function extractSection(line: string, nextIndex: number) {
  const bracket = line.match(/^\s*\[([^\]]+)]\s*(?:\(?\s*(\d+\s*x)\s*\)?)?\s*$/i);
  if (bracket) {
    return {
      type: sectionName(bracket[1], nextIndex),
      repeat: bracket[2]?.replace(/\s+/g, "").toUpperCase() ?? null,
    };
  }

  const simple = line.trim();
  if (simple.length > 32 || isChordLine(simple)) return null;
  if (/^(intro|introdução|primeira parte|segunda parte|terceira parte|quarta parte|parte\s*\d+|verso\s*\d*|pré[-\s]?refrão|pre[-\s]?refrão|refrão|ponte|solo|interlúdio|final)\b/i.test(simple)) {
    const repeat = simple.match(/\b(\d+\s*x)\b/i)?.[1]?.replace(/\s+/g, "").toUpperCase() ?? null;
    return { type: sectionName(simple, nextIndex), repeat };
  }
  return null;
}

function keyFromChord(chord: string) {
  const root = cleanToken(chord).match(/^([A-G](?:#|b)?)(m)?/)?.[0] ?? "C";
  return KEY_RE.test(root) ? root : "C";
}

function detectKey(text: string, blocks: ParsedCifraBlock[]) {
  const explicit = normalizeAccidentals(text).match(/(?:^|\b)(?:tom|key)\s*[:：-]?\s*([A-G](?:#|b)?m?)/i)?.[1];
  if (explicit && KEY_RE.test(explicit)) return explicit;

  const all = blocks.flatMap((block) => block.chords);
  const final = all.at(-1);
  if (final) return keyFromChord(final);
  return "C";
}

function detectBpm(text: string) {
  const value = Number(text.match(/(?:bpm|tempo)\s*[:=]?\s*(\d{2,3})/i)?.[1]);
  return Number.isFinite(value) && value >= 40 && value <= 240 ? value : 72;
}

function detectTime(text: string) {
  return text.match(/\b(2\/4|3\/4|4\/4|5\/4|6\/8|9\/8|12\/8)\b/)?.[1] ?? "4/4";
}

function detectRhythm(text: string) {
  const rhythm = text.match(/(?:ritmo|batida|levada)\s*[:：-]\s*([^\n]+)/i)?.[1]?.trim();
  if (rhythm) return rhythm.slice(0, 40);
  return "Adoração";
}

export function parseCifraLocally(
  text: string,
  hints: { titleHint?: string; artistHint?: string } = {},
): ParsedCifraSong {
  const normalized = normalizeAccidentals(text).replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const blocks: ParsedCifraBlock[] = [];
  let current: ParsedCifraBlock | null = null;
  let partIndex = 1;

  const ensureBlock = () => {
    if (!current) {
      current = { type: blocks.length === 0 ? "INTRODUÇÃO" : `PARTE ${partIndex++}`, chords: [] };
      blocks.push(current);
    }
    return current;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u00a0/g, " ").trim();
    if (!line) continue;
    if (/^(tom|afinação|afinacao|capotraste|capo)\b/i.test(line)) continue;

    const section = extractSection(line, partIndex);
    if (section) {
      current = { type: section.type, repeat: section.repeat, chords: [] };
      blocks.push(current);
      if (/^PARTE \d+/.test(section.type)) partIndex += 1;
      continue;
    }

    if (isChordLine(line)) {
      const block = ensureBlock();
      block.chords.push(...splitChords(line));
      const inlineSection = line.match(/^\s*\[([^\]]+)]/);
      if (inlineSection) block.type = sectionName(inlineSection[1], partIndex);
      continue;
    }

    if (current?.chords.length && !current.lyric && !/^\d+\s*x$/i.test(line)) {
      current.lyric = line.slice(0, 90);
    }
  }

  const validBlocks = blocks
    .map((block, index) => {
      // Modo compacto: colapsa repetições consecutivas do mesmo acorde
      // (E E E B E → E B E). Mantém a ordem harmônica sem o ruído de linhas
      // que só reforçam o mesmo acorde.
      const dedup: string[] = [];
      for (const c of block.chords.filter(Boolean)) {
        if (dedup[dedup.length - 1] !== c) dedup.push(c);
      }
      return {
        ...block,
        type: block.type || (index === 0 ? "INTRODUÇÃO" : `PARTE ${index}`),
        chords: dedup,
        repeat: block.repeat ?? null,
        lyric: block.lyric ?? null,
        note: block.note ?? null,
      };
    })
    .filter((block) => block.chords.length > 0);

  return {
    title: hints.titleHint?.trim() || "Nova Música",
    artist: hints.artistHint?.trim() || "",
    originalKey: detectKey(normalized, validBlocks),
    bpm: detectBpm(normalized),
    bpmEstimated: !/(?:bpm|tempo)\s*[:=]?\s*\d{2,3}/i.test(normalized),
    time: detectTime(normalized),
    rhythm: detectRhythm(normalized),
    blocks: validBlocks.length
      ? validBlocks
      : [{ type: "INTRODUÇÃO", chords: splitChords(normalized), repeat: null, lyric: null, note: null }].filter(
          (block) => block.chords.length > 0,
        ),
  };
}

export function extractJsonObject(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate || !candidate.startsWith("{")) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function normalizeSongMap(raw: unknown, fallback: ParsedCifraSong): ParsedCifraSong {
  if (!raw || typeof raw !== "object") return fallback;
  const value = raw as Record<string, unknown>;
  const rawBlocks =
    (Array.isArray(value.blocks) && value.blocks) ||
    (Array.isArray(value.structure) && value.structure) ||
    (Array.isArray(value.sections) && value.sections) ||
    [];

  const blocks = rawBlocks
    .map((item, index): ParsedCifraBlock | null => {
      if (!item || typeof item !== "object") return null;
      const block = item as Record<string, unknown>;
      const chordValue = block.chords ?? block.acordes ?? block.progression;
      const rawChords = Array.isArray(chordValue)
        ? chordValue.map((chord) => String(chord)).flatMap(splitChords)
        : splitChords(String(chordValue ?? ""));
      if (!rawChords.length) return null;
      // Modo compacto: colapsa repetições consecutivas do mesmo acorde.
      const chords: string[] = [];
      for (const c of rawChords) if (chords[chords.length - 1] !== c) chords.push(c);
      return {
        type: String(block.type ?? block.name ?? block.section ?? (index === 0 ? "INTRODUÇÃO" : `PARTE ${index}`)).toUpperCase(),
        chords,
        repeat: block.repeat == null ? null : String(block.repeat),
        lyric: block.lyric == null ? null : String(block.lyric).slice(0, 90),
        note: block.note == null ? null : String(block.note),
      };
    })
    .filter((block): block is ParsedCifraBlock => Boolean(block));

  const key = String(value.originalKey ?? value.key ?? value.tom ?? fallback.originalKey);
  const bpm = Number(value.bpm ?? fallback.bpm);

  return {
    title: String(value.title ?? value.titulo ?? fallback.title),
    artist: String(value.artist ?? value.artista ?? fallback.artist),
    originalKey: KEY_RE.test(key) ? key : fallback.originalKey,
    bpm: Number.isFinite(bpm) && bpm >= 40 && bpm <= 240 ? bpm : fallback.bpm,
    bpmEstimated: typeof value.bpmEstimated === "boolean" ? value.bpmEstimated : fallback.bpmEstimated,
    time: String(value.time ?? value.compasso ?? fallback.time),
    rhythm: String(value.rhythm ?? value.ritmo ?? fallback.rhythm),
    blocks: blocks.length ? blocks : fallback.blocks,
  };
}