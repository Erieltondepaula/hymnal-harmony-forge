// Client-side extractors for .txt, .pdf, .docx.
// PDF/DOCX libs are dynamically imported to keep the initial bundle small.

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Vite serves the worker as a real URL at build/dev time.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({
    data: buf,
    isEvalSupported: false,
  } as never).promise;

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
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

async function extractRtf(file: File): Promise<string> {
  const raw = await file.text();
  return raw
    .replace(/\\'[0-9a-f]{2}/gi, "")
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  if (name.endsWith(".doc")) {
    throw new Error("Arquivos .doc antigos não são suportados. Salve como .docx ou PDF e tente novamente.");
  }
  if (name.endsWith(".rtf") || file.type === "application/rtf" || file.type === "text/rtf") {
    return extractRtf(file);
  }
  return (await file.text()).trim();
}
