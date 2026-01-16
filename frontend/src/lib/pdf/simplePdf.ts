function escapePdfText(value: string) {
  return value.replace(/[()\\]/g, "\\$&");
}

function buildPdfObjects(objects: string[]) {
  const chunks: string[] = [];
  const offsets: number[] = [];

  chunks.push("%PDF-1.4\n");
  for (let index = 0; index < objects.length; index++) {
    offsets.push(chunks.join("").length);
    chunks.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
  }

  const xrefOffset = chunks.join("").length;
  chunks.push("xref\n");
  chunks.push(`0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (const offset of offsets) {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }

  chunks.push("trailer\n");
  chunks.push(`<< /Size ${objects.length + 1} /Root 1 0 R >>\n`);
  chunks.push("startxref\n");
  chunks.push(`${xrefOffset}\n`);
  chunks.push("%%EOF\n");

  return Buffer.from(chunks.join(""), "binary");
}

export function renderArtifactPdf(title: string, lines: string[]): Buffer {
  const textLines = [title, ...lines].slice(0, 24);
  const contentLines: string[] = ["BT", "/F1 18 Tf", "72 760 Td", `(${escapePdfText(textLines[0] ?? "")}) Tj`];

  contentLines.push("/F1 11 Tf");
  for (let i = 1; i < textLines.length; i++) {
    contentLines.push("0 -18 Td");
    contentLines.push(`(${escapePdfText(textLines[i] ?? "")}) Tj`);
  }
  contentLines.push("ET");

  const contentStream = contentLines.join("\n") + "\n";
  const contentObj = `<< /Length ${Buffer.byteLength(contentStream, "binary")} >>\nstream\n${contentStream}endstream`;

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Count 1 /Kids [3 0 R] >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    contentObj
  ];

  return buildPdfObjects(objects);
}

