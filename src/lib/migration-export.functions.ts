import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MIGRATION_BUCKETS, MIGRATION_TABLES } from "./migration-tables";

/** Contagem de registros por tabela (somente admin). */
export const getMigrationCounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Acesso restrito a administradores");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const counts: { table: string; count: number }[] = [];
    for (const table of MIGRATION_TABLES) {
      const { count } = await supabaseAdmin
        .from(table)
        .select("id", { count: "exact", head: true });
      counts.push({ table, count: count ?? 0 });
    }
    return { counts };
  });

/** Dump de uma tabela em CSV ou SQL (somente admin). */
export const exportMigrationTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        table: z.enum(MIGRATION_TABLES),
        format: z.enum(["csv", "sql"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Acesso restrito a administradores");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rowsToCsv, rowsToInserts } = await import("./migration-export.server");

    const { data: rows, error } = await supabaseAdmin.from(data.table).select("*");
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Record<string, unknown>[];

    return {
      table: data.table,
      rows: list.length,
      content:
        data.format === "csv" ? rowsToCsv(list) : rowsToInserts(data.table, list),
    };
  });

/** Todas as tabelas em um único data.sql, na ordem de dependência (somente admin). */
export const exportMigrationData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Acesso restrito a administradores");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rowsToInserts } = await import("./migration-export.server");

    const parts: string[] = [
      "-- FitPower — carga de dados",
      "-- Execute somente APÓS o schema.sql e após recriar os usuários de autenticação.",
      "-- Ajuste os user_id para os novos UUIDs do projeto de destino.",
      "",
    ];
    let total = 0;
    for (const table of MIGRATION_TABLES) {
      const { data: rows, error } = await supabaseAdmin.from(table).select("*");
      if (error) throw new Error(`${table}: ${error.message}`);
      const list = (rows ?? []) as Record<string, unknown>[];
      total += list.length;
      parts.push(rowsToInserts(table, list));
    }
    return { content: parts.join("\n"), rows: total };
  });

/** Lista os arquivos dos buckets com URL assinada para download (somente admin). */
export const listMigrationFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Acesso restrito a administradores");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buckets: {
      bucket: string;
      files: { path: string; size: number; url: string | null }[];
    }[] = [];

    for (const bucket of MIGRATION_BUCKETS) {
      const paths: { path: string; size: number }[] = [];
      const roots = ["", "covers", "pdfs"];
      for (const root of roots) {
        const { data: entries } = await supabaseAdmin.storage
          .from(bucket)
          .list(root, { limit: 1000 });
        for (const entry of entries ?? []) {
          if (!entry.id) continue; // pasta
          const full = root ? `${root}/${entry.name}` : entry.name;
          if (paths.some((p) => p.path === full)) continue;
          paths.push({
            path: full,
            size: (entry.metadata as { size?: number } | null)?.size ?? 0,
          });
        }
      }

      const files: { path: string; size: number; url: string | null }[] = [];
      for (const item of paths) {
        const { data: signed } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(item.path, 60 * 60);
        files.push({ ...item, url: signed?.signedUrl ?? null });
      }
      buckets.push({ bucket, files });
    }

    return { buckets };
  });
