export type CsvRecord = Record<string, string>;

export const parseCsv = (input: string): CsvRecord[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const text = input.replace(/^\uFEFF/u, "");

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "\"") {
      if (quoted && text[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  if (quoted) throw new Error("CSV 含有未闭合的引号");
  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  if (headers.length === 0 || headers.some((header) => !header)) {
    throw new Error("CSV 第一行必须包含完整列名");
  }
  if (new Set(headers).size !== headers.length) throw new Error("CSV 列名不能重复");
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
};
