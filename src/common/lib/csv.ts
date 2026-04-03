type CsvPrimitive = string | number | boolean | null | undefined;

function escapeCsvValue(value: CsvPrimitive): string {
  const normalized = value == null ? "" : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function buildCsv(
  headers: string[],
  rows: Array<Array<CsvPrimitive>>,
  delimiter: string = ";",
): string {
  const headerLine = headers.map(escapeCsvValue).join(delimiter);
  const rowLines = rows.map((row) => row.map(escapeCsvValue).join(delimiter));

  return [headerLine, ...rowLines].join("\n");
}

export function downloadCsv(content: string, filename: string): void {
  // Prefix BOM so Excel reads UTF-8 Cyrillic correctly.
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}