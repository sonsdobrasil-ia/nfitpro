import type { MigrationTable } from "./migration-tables";

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    const inner = value
      .map((v) => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
      .join(",");
    return `'{${inner.replace(/'/g, "''")}}'`;
  }
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]!);
  const lines = [cols.join(",")];
  for (const row of rows) lines.push(cols.map((c) => csvCell(row[c])).join(","));
  return `${lines.join("\n")}\n`;
}

export function rowsToInserts(table: MigrationTable, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return `-- ${table}: nenhum registro\n`;
  const cols = Object.keys(rows[0]!);
  const values = rows
    .map((row) => `  (${cols.map((c) => sqlLiteral(row[c])).join(", ")})`)
    .join(",\n");
  return [
    `-- ${table} (${rows.length} registro(s))`,
    `insert into public.${table} (${cols.join(", ")}) values`,
    `${values}`,
    `on conflict (id) do nothing;`,
    "",
  ].join("\n");
}
