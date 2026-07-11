// Client-side extractors for .txt, .pdf, .docx.
// PDF/DOCX libs are dynamically imported to keep the initial bundle small.

async function extractPdf(file: File): Promise<string> {
  const pdfjs: typeof import("pdfjs-dist") = await import("pdfjs-dist");
  // Disable worker: run inline (fine for typical cifra PDFs).
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = "";
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({
    data: buf,
    disableWorker: true,
    isEvalSupported: false,
  } as never).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Reconstruct rows: group by "transform"[5] (y position) so cifras
    // com acordes acima da letra permaneçam alinhadas.
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = Math.round((item.transform?.[5] ?? 0) * 10) / 10;
      const x = item.transform?.[4] ?? 0;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, str: item.str });
    }
    const ys = Array.from(rows.keys()).sort((a, b) => b - a);
    for (const y of ys) {
      const line = rows
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((r) => r.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trimEnd();
      if (line.trim()) parts.push(line);
    }
    parts.push("");
  }
  return parts.join("\n").trim();
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value ?? "").trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file);
  }
  if (
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(file);
  }
  // Default: treat as text.
  return await file.text();
}
