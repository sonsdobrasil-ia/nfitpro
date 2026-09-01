import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Download, FileCode2, FolderDown, ListChecks, Loader2 } from "lucide-react";
import { MIGRATION_CHECKLIST_MD, MIGRATION_SCHEMA_SQL } from "@/lib/migration-schema";
import { MIGRATION_TABLES, type MigrationTable } from "@/lib/migration-tables";
import {
  exportMigrationData,
  exportMigrationTable,
  getMigrationCounts,
  listMigrationFiles,
} from "@/lib/migration-export.functions";

export const Route = createFileRoute("/_authenticated/admin/migration")({
  component: AdminMigration,
});

function download(name: string, content: string, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

const STEPS = [
  "Criar um novo projeto no Supabase de destino",
  "Rodar o schema.sql no SQL Editor do destino",
  "Conferir os buckets ebook-covers e ebook-pdfs (privados)",
  "Baixar e reenviar os arquivos mantendo os mesmos caminhos",
  "Recriar/convidar os usuários de login no destino",
  "Rodar o data.sql, ajustando os user_id para os novos UUIDs",
  "Definir o admin na tabela user_roles",
  "Trocar as variáveis de ambiente do app para o novo projeto",
  "Reapontar o webhook da Cakto e refazer uma compra de teste",
];

function AdminMigration() {
  const fetchCounts = useServerFn(getMigrationCounts);
  const fetchTable = useServerFn(exportMigrationTable);
  const fetchAllData = useServerFn(exportMigrationData);
  const fetchFiles = useServerFn(listMigrationFiles);

  const [counts, setCounts] = useState<{ table: string; count: number }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [files, setFiles] = useState<
    { bucket: string; files: { path: string; size: number; url: string | null }[] }[] | null
  >(null);

  useEffect(() => {
    fetchCounts({})
      .then((res) => setCounts(res.counts))
      .catch((e: Error) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTable(table: MigrationTable, format: "csv" | "sql") {
    setBusy(`${table}-${format}`);
    try {
      const res = await fetchTable({ data: { table, format } });
      download(`${table}.${format}`, res.content || `-- ${table}: vazio\n`);
      toast.success(`${table}: ${res.rows} registro(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleAllData() {
    setBusy("all");
    try {
      const res = await fetchAllData({});
      download("data.sql", res.content);
      toast.success(`data.sql gerado com ${res.rows} registro(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleFiles() {
    setBusy("files");
    try {
      const res = await fetchFiles({});
      setFiles(res.buckets);
      const total = res.buckets.reduce((a, b) => a + b.files.length, 0);
      toast.success(`${total} arquivo(s) encontrados`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <FileCode2 className="size-4 text-primary" /> 1. Estrutura (schema)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          SQL completo com tabelas, permissões, políticas de segurança, funções, triggers e os
          buckets de arquivos. Rode no SQL Editor do projeto de destino antes de qualquer dado.
        </p>
        <Button className="mt-3" onClick={() => download("schema.sql", MIGRATION_SCHEMA_SQL)}>
          <Download className="size-4" /> Baixar schema.sql
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Database className="size-4 text-primary" /> 2. Dados
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Os usuários de login não saem por aqui: no destino eles são recriados por convite ou
          senha, e recebem novos identificadores. Ajuste os <code>user_id</code> do arquivo de
          dados antes de rodar.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Tabela</th>
                <th className="py-2 pr-3">Registros</th>
                <th className="py-2">Exportar</th>
              </tr>
            </thead>
            <tbody>
              {MIGRATION_TABLES.map((table) => {
                const row = counts?.find((c) => c.table === table);
                return (
                  <tr key={table} className="border-t">
                    <td className="py-2 pr-3 font-medium">{table}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {counts ? (row?.count ?? 0) : "…"}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy !== null}
                          onClick={() => handleTable(table, "csv")}
                        >
                          {busy === `${table}-csv` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : null}
                          CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy !== null}
                          onClick={() => handleTable(table, "sql")}
                        >
                          {busy === `${table}-sql` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : null}
                          SQL
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Button className="mt-3" disabled={busy !== null} onClick={handleAllData}>
          {busy === "all" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Baixar tudo (data.sql)
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <FolderDown className="size-4 text-primary" /> 3. Arquivos (capas e PDFs)
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Baixe cada arquivo e reenvie no destino usando exatamente o mesmo caminho, para que os
          registros dos eBooks continuem apontando corretamente.
        </p>
        <Button className="mt-3" variant="outline" disabled={busy !== null} onClick={handleFiles}>
          {busy === "files" ? <Loader2 className="size-4 animate-spin" /> : null}
          Listar arquivos
        </Button>

        {files?.map((b) => (
          <div key={b.bucket} className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {b.bucket} <span className="text-muted-foreground">({b.files.length})</span>
              </h3>
              {b.files.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    download(`${b.bucket}-paths.txt`, b.files.map((f) => f.path).join("\n") + "\n")
                  }
                >
                  Baixar lista de caminhos
                </Button>
              )}
            </div>
            {b.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum arquivo.</p>
            ) : (
              <ul className="mt-1 divide-y text-sm">
                {b.files.map((f) => (
                  <li key={f.path} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate">{f.path}</span>
                    <span className="flex items-center gap-3 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                      {f.url ? (
                        <a
                          className="text-primary underline"
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Baixar
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">indisponível</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <ListChecks className="size-4 text-primary" /> 4. Checklist de migração
        </h2>
        <ol className="mt-3 space-y-2 text-sm">
          {STEPS.map((s, i) => (
            <li key={s} className="flex gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => download("checklist-migracao.md", MIGRATION_CHECKLIST_MD)}
        >
          <Download className="size-4" /> Baixar checklist (.md)
        </Button>
      </Card>
    </div>
  );
}
