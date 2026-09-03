import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload, Loader2, FileText, Code2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { uploadCover, deleteCover } from "@/lib/ebook-covers";
import { uploadPdf, deletePdf, CATEGORIAS, resolvePdfUrl, pdfExists } from "@/lib/ebook-files";
import { convertPdfToHtml, deleteEbookHtml } from "@/lib/ebook-html";

import { extractPdfInfo } from "@/lib/pdf";
import { CoverImage } from "@/components/CoverImage";


export const Route = createFileRoute("/_authenticated/admin/ebooks")({
  component: AdminEbooks,
});

const ebookSchema = z.object({
  titulo: z.string().trim().min(2, "Mínimo 2 caracteres").max(200),
  descricao: z.string().trim().max(2000).optional().nullable(),
  categoria: z.string().trim().min(1, "Selecione uma categoria").max(60),
  paginas: z.number().int().min(1, "Informe o número de páginas").max(10000),
  preco: z.number().min(0, "Preço não pode ser negativo").max(99999),
  capa_url: z.string().trim().max(500).optional().nullable(),
  pdf_url: z.string().trim().max(500).optional().nullable(),
  publicado: z.boolean(),
});

type Ebook = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  paginas: number | null;
  capa_url: string | null;
  pdf_url: string | null;
  html_url: string | null;
  html_preview_url: string | null;
  preco: number | null;
  publicado: boolean;
};

const empty = (): Partial<Ebook> => ({
  titulo: "",
  descricao: "",
  categoria: "",
  paginas: 0,
  capa_url: "",
  pdf_url: "",
  html_url: "",
  html_preview_url: "",
  preco: 0,
  publicado: false,

});

function AdminEbooks() {
  const [list, setList] = useState<Ebook[]>([]);
  const [editing, setEditing] = useState<Partial<Ebook> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Track which ebook ids are currently being converted
  const [converting, setConverting] = useState<Record<string, { current: number; total: number }>>({});
  // Ids whose pdf_url points to a file that does not exist in storage
  const [missingPdf, setMissingPdf] = useState<Record<string, boolean>>({});

  const load = async () => {
    const { data, error } = await supabase
      .from("ebooks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    const rows = (data as any[]) ?? [];
    setList(rows);
    const checks = await Promise.all(
      rows.map(async (r) => [r.id, r.pdf_url ? !(await pdfExists(r.pdf_url)) : true] as const),
    );
    setMissingPdf(Object.fromEntries(checks));
  };
  useEffect(() => {
    load();
  }, []);


  const open = (e?: Ebook) => {
    setErrors({});
    setEditing(e ? { ...e } : empty());
  };

  /**
   * Converte o PDF de um eBook salvo em HTML (completo + prévia) e grava os caminhos.
   */
  const convertToHtml = async (
    e: Pick<Ebook, "id" | "titulo" | "pdf_url" | "paginas">,
    silent = false,
  ) => {
    if (!e.pdf_url) {
      if (!silent) toast.error("Este eBook não tem PDF.");
      return false;
    }
    if (converting[e.id]) return false;

    setConverting((prev) => ({ ...prev, [e.id]: { current: 0, total: e.paginas ?? 0 } }));
    try {
      const exists = await pdfExists(e.pdf_url);
      if (!exists) {
        throw new Error(`Arquivo do PDF não encontrado no armazenamento (${e.pdf_url}). Reenvie o PDF.`);
      }
      const signedUrl = await resolvePdfUrl(e.pdf_url);
      if (!signedUrl) throw new Error("Não foi possível obter o URL do PDF.");

      const result = await convertPdfToHtml(signedUrl, e.id, (current, total) => {
        setConverting((prev) => ({ ...prev, [e.id]: { current, total } }));
      });

      const { error } = await supabase
        .from("ebooks")
        .update({
          html_url: result.htmlPath,
          html_preview_url: result.previewPath,
          paginas: result.totalPages,
        } as any)
        .eq("id", e.id);
      if (error) throw new Error(error.message);

      toast.success(
        `"${e.titulo}" convertido: ${result.totalPages} páginas (prévia de ${result.previewPageCount}).`,
      );
      load();
      return true;
    } catch (err: any) {
      toast.error(err.message ?? "Falha na conversão para HTML");
      return false;
    } finally {
      setConverting((prev) => {
        const next = { ...prev };
        delete next[e.id];
        return next;
      });
    }
  };


  const onUploadPdf = async (file: File) => {
    if (!editing) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return toast.error("Selecione um arquivo PDF");
    }
    if (file.size > 50 * 1024 * 1024) return toast.error("O PDF deve ter até 50MB");
    setUploading(true);
    try {
      const { pages, cover } = await extractPdfInfo(file);
      const [pdfPath, coverPath] = await Promise.all([uploadPdf(file), uploadCover(cover)]);
      const oldPdf = editing.pdf_url;
      const oldCover = editing.capa_url;
      if (oldPdf) await deletePdf(oldPdf);
      if (oldCover) await deleteCover(oldCover);
      if (editing.id) await deleteEbookHtml(editing.id);
      setEditing({
        ...editing,
        pdf_url: pdfPath,
        capa_url: coverPath,
        paginas: pages,
        html_url: null,
        html_preview_url: null,
      });
      toast.success(`PDF enviado — ${pages} páginas, capa extraída da 1ª página`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao processar o PDF");
    } finally {
      setUploading(false);
    }
  };


  const save = async () => {
    if (!editing) return;
    const parsed = ebookSchema.safeParse({
      titulo: editing.titulo ?? "",
      descricao: editing.descricao ?? null,
      categoria: editing.categoria ?? "",
      paginas: Number(editing.paginas ?? 0),
      preco: Number(editing.preco ?? 0),
      capa_url: editing.capa_url ?? null,
      pdf_url: editing.pdf_url ?? null,
      publicado: !!editing.publicado,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path.join(".")] = i.message;
      });
      setErrors(errs);
      return toast.error("Corrija os campos destacados");
    }
    if (!parsed.data.pdf_url) {
      setErrors({ pdf_url: "Envie o PDF do eBook" });
      return toast.error("Envie o PDF do eBook");
    }
    // Confirma que o arquivo existe antes de gravar o caminho
    const exists = await pdfExists(parsed.data.pdf_url);
    if (!exists) {
      setErrors({ pdf_url: "O arquivo do PDF não foi encontrado no armazenamento. Reenvie o PDF." });
      return toast.error("PDF não encontrado no armazenamento — reenvie o arquivo.");
    }

    setSaving(true);
    const payload = {
      ...parsed.data,
      html_url: editing.html_url ?? null,
      html_preview_url: editing.html_preview_url ?? null,
    } as any;
    const { data: saved, error } = editing.id
      ? await supabase.from("ebooks").update(payload).eq("id", editing.id).select("id").maybeSingle()
      : await supabase.from("ebooks").insert(payload).select("id").maybeSingle();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    const titulo = parsed.data.titulo;
    const pdfPath = parsed.data.pdf_url;
    const paginas = Number(parsed.data.paginas);
    const jaTemHtml = !!editing.html_url && !!editing.html_preview_url;
    setEditing(null);
    setErrors({});
    load();

    // Conversão automática para HTML (completo + prévia) logo após salvar
    const savedId = (saved as any)?.id;
    if (!jaTemHtml && savedId) {
      await convertToHtml({ id: savedId, titulo, pdf_url: pdfPath, paginas });
    }
  };

  const remove = async (e: Ebook) => {
    if (!confirm(`Excluir "${e.titulo}"?`)) return;
    if (e.capa_url) await deleteCover(e.capa_url);
    if (e.pdf_url) await deletePdf(e.pdf_url);
    await deleteEbookHtml(e.id);
    const { error } = await supabase.from("ebooks").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };


  const togglePublish = async (e: Ebook) => {
    if (!e.publicado && !e.pdf_url) return toast.error("Envie o PDF antes de publicar");
    const { error } = await supabase
      .from("ebooks")
      .update({ publicado: !e.publicado })
      .eq("id", e.id);
    if (error) return toast.error(error.message);
    load();
  };

  const err = (k: string) => errors[k];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Produtos (eBooks)</h2>
        <Button onClick={() => open()} size="sm">
          <Plus className="size-4 mr-1" /> Novo
        </Button>
      </div>
      <div className="grid gap-3">
        {list.map((e) => {
          const conv = converting[e.id];
          const hasHtml = !!e.html_url && !!e.html_preview_url;
          const hasPdf = !!e.pdf_url;
          const pdfMissing = missingPdf[e.id];

          return (
            <Card key={e.id} className="p-4 flex items-center gap-3">
              <CoverImage
                value={e.capa_url}
                className="h-16 w-12 rounded object-cover bg-muted shrink-0"
                alt={e.titulo}
                fallback={<div className="h-16 w-12 rounded bg-muted shrink-0" />}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{e.titulo}</div>
                <div className="text-xs text-muted-foreground truncate">{e.descricao}</div>
                <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant={e.publicado ? "default" : "secondary"}>
                    {e.publicado ? "Publicado" : "Rascunho"}
                  </Badge>
                  {e.categoria && <Badge variant="outline">{e.categoria}</Badge>}
                  {hasHtml && (
                    <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
                      <CheckCircle2 className="size-3" /> HTML + prévia
                    </Badge>
                  )}
                  {pdfMissing && (
                    <Badge variant="destructive">PDF ausente — reenvie o arquivo</Badge>
                  )}

                  <span>R$ {Number(e.preco ?? 0).toFixed(2)}</span>
                  <span className="text-muted-foreground">· {e.paginas ?? 0} pág.</span>
                  {conv && (
                    <span className="text-xs text-primary font-medium">
                      Convertendo {conv.current}/{conv.total} págs…
                    </span>
                  )}
                </div>
              </div>

              {/* Convert to HTML button — only shown when PDF exists but HTML doesn't (and not currently converting) */}
              {hasPdf && !hasHtml && !conv && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-primary/50 text-primary hover:bg-primary/10 shrink-0"
                  onClick={() => convertToHtml(e)}
                  title="Converter PDF para HTML (leitura web)"
                >
                  <Code2 className="size-4" />
                  <span className="hidden sm:inline">Converter HTML</span>
                </Button>
              )}

              {/* Spinner while converting */}
              {conv && (
                <div className="shrink-0 flex items-center gap-1 text-primary text-xs font-medium">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              )}

              <Button size="sm" variant="outline" onClick={() => togglePublish(e)}>
                {e.publicado ? "Despublicar" : "Publicar"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => open(e)}>
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(e)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </Card>
          );
        })}
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum eBook cadastrado.</p>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && (setEditing(null), setErrors({}))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar eBook" : "Novo eBook"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-[140px_1fr] gap-4">
                <div>
                  <Label className="mb-2 block">Capa (1ª página)</Label>
                  <div className="relative h-40 w-32 rounded-md border bg-muted overflow-hidden">
                    <CoverImage
                      value={editing.capa_url}
                      className="size-full object-cover"
                      fallback={
                        <div className="size-full grid place-items-center text-xs text-muted-foreground text-center px-2">
                          Extraída do PDF
                        </div>
                      }
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 grid place-items-center">
                        <Loader2 className="size-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <label className="mt-2 inline-flex items-center gap-1 text-xs text-primary cursor-pointer">
                    <Upload className="size-3" /> Enviar PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadPdf(f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {editing.pdf_url && (
                    <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                      <FileText className="size-3" /> PDF enviado
                    </p>
                  )}
                  {editing.html_url ? (
                    <p className="mt-1 text-[11px] text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> HTML gerado
                    </p>
                  ) : editing.pdf_url ? (
                    <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                      <Code2 className="size-3" /> HTML: será gerado ao salvar
                    </p>
                  ) : null}
                  {err("pdf_url") && (
                    <p className="text-xs text-destructive mt-1">{err("pdf_url")}</p>
                  )}
                </div>
                <div className="space-y-3">
                  <Field label="Nome *" error={err("titulo")}>
                    <Input
                      value={editing.titulo ?? ""}
                      onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
                      maxLength={200}
                    />
                  </Field>
                </div>
              </div>

              <Field label="Descrição" error={err("descricao")}>
                <Textarea
                  rows={6}
                  value={editing.descricao ?? ""}
                  onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
                  maxLength={2000}
                  className="min-h-[160px] resize-y"
                />
              </Field>

              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Categoria *" error={err("categoria")}>
                  <Select
                    value={editing.categoria ?? ""}
                    onValueChange={(v) => setEditing({ ...editing, categoria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Páginas *" error={err("paginas")}>
                  <Input
                    type="number"
                    min="1"
                    value={editing.paginas ?? 0}
                    onChange={(e) => setEditing({ ...editing, paginas: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Preço (R$)" error={err("preco")}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editing.preco ?? 0}
                    onChange={(e) => setEditing({ ...editing, preco: Number(e.target.value) })}
                  />
                </Field>
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-md">
                <Switch
                  checked={editing.publicado ?? false}
                  onCheckedChange={(v) => setEditing({ ...editing, publicado: v })}
                />
                <div className="flex-1">
                  <Label>{editing.publicado ? "Publicado" : "Rascunho"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {editing.publicado
                      ? "Visível para todos os usuários autenticados."
                      : "Apenas administradores podem visualizar."}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => (setEditing(null), setErrors({}))}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving || uploading}>
              {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
