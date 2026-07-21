// Shared normalization + similarity primitives for the import pipeline.

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeLyric(lyric: string | null | undefined): string {
  if (!lyric) return "";
  return stripDiacritics(lyric.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Root + quality only, dropping bass inversion (`/x`) and duplicate spacing. */
export function normalizeChord(chord: string): string {
  const c = chord.trim().split("/")[0];
  return c
    .replace(/\s+/g, "")
    .replace(/maj/gi, "M")
    .replace(/min/gi, "m")
    .replace(/♯/g, "#")
    .replace(/♭/g, "b");
}

export function normalizeChordSeq(chords: string[]): string[] {
  return chords.map(normalizeChord);
}

/** Jaccard on unique tokens. */
export function jaccard<T>(a: T[], b: T[]): number {
  if (!a.length && !b.length) return 1;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Longest-common-subsequence length. */
export function lcs<T>(a: T[], b: T[]): number {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return 0;
  const dp = new Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    let prev = 0;
    for (let j = 1; j <= m; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) dp[j] = prev + 1;
      else dp[j] = Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[m];
}

export function seqSimilarity<T>(a: T[], b: T[]): number {
  if (!a.length && !b.length) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 0;
  return lcs(a, b) / maxLen;
}

/** Levenshtein distance normalized to a [0,1] similarity. */
export function levenshteinSim(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => i);
  for (let j = 1; j <= m; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= n; i++) {
      const tmp = dp[i];
      dp[i] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  const dist = dp[n];
  const maxLen = Math.max(n, m);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

export function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}
