import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Plus, Save, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { usePlans, type PlanRow } from "@/lib/use-plans";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: AdminPlans,
});

const WEBHOOK_PATH = "/api/public/webhooks/cakto";

type Draft = Omit<PlanRow, "id"> & { id?: string };

const emptyDraft: Draft = {
  nome: "",
  slug: "",
  descricao: "",
  preco: 0,
  intervalo: "mensal",
  cakto_offer_id: "",
  checkout_url: "",
  destaque: false,
  ativo: true,
  ordem: 99,
};

function AdminPlans() {
  const { plans, loading, reload } = usePlans(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}${WEBHOOK_PATH}` : WEBHOOK_PATH;

  async function save() {
    if (!draft) return;
    if (!draft.nome.trim() || !draft.slug.trim()) {
      toast.error("Informe nome e identificador do plano");
      return;
    }
    setSaving(true);
    const payload = {
      nome: draft.nome.trim(),
      slug: draft.slug.trim().toLowerCase(),
      descricao: draft.descricao?.trim() || null,
      preco: Number(draft.preco) || 0,
      intervalo: draft.intervalo,
      provider: "cakto",
      cakto_offer_id: draft.cakto_offer_id?.trim() || null,
      checkout_url: draft.checkout_url?.trim() || null,
      destaque: draft.destaque,
      ativo: draft.ativo,
      ordem: Number(draft.ordem) || 0,
    };
    const { error } = draft.id
      ? await supabase.from("plans").update(payload).eq("id", draft.id)
      : await supabase.from("plans").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    toast.success("Plano salvo");
    setDraft(null);
    await reload();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir", { description: error.message });
      return;
    }
    toast.success("Plano excluído");
    await reload();
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <CreditCard className="size-4 text-primary" /> Webhook da Cakto
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No painel da Cakto, cadastre esta URL como webhook (eventos de compra e de assinatura):
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs break-all">{webhookUrl}</code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(webhookUrl);
              toast.success("URL copiada");
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          O webhook exige o segredo <code>CAKTO_WEBHOOK_SECRET</code> configurado no backend. A Cakto
          deve enviá-lo no header <code>x-cakto-secret</code> (ou assinar o corpo em
          <code> x-cakto-signature</code>). Na compra aprovada, se o e-mail ainda não tem conta, o
          usuário é criado automaticamente com a senha padrão <code>fitpower123</code> e recebe um
          e-mail para definir a própria senha.
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Planos</h2>
          <Button size="sm" onClick={() => setDraft({ ...emptyDraft })}>
            <Plus className="size-4 mr-1" /> Novo plano
          </Button>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
        ) : plans.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {plans.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm"
              >
                <div className="flex-1 min-w-40">
                  <div className="font-semibold">
                    {p.nome}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({p.slug} · {p.intervalo})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground break-all">
                    Oferta Cakto: {p.cakto_offer_id || "—"} · Checkout: {p.checkout_url || "—"}
                  </div>
                </div>
                <span className="font-bold text-primary">
                  {Number(p.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    p.ativo ? "bg-secondary/15 text-secondary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.ativo ? "ativo" : "inativo"}
                </span>
                <Button size="sm" variant="outline" onClick={() => setDraft({ ...p })}>
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {draft && (
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">{draft.id ? "Editar plano" : "Novo plano"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nome</Label>
              <Input
                value={draft.nome}
                onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Identificador (slug)</Label>
              <Input
                value={draft.slug}
                placeholder="mensal"
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={draft.preco}
                onChange={(e) => setDraft({ ...draft, preco: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Intervalo</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={draft.intervalo}
                onChange={(e) => setDraft({ ...draft, intervalo: e.target.value })}
              >
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
            <div>
              <Label>ID da oferta na Cakto</Label>
              <Input
                value={draft.cakto_offer_id ?? ""}
                placeholder="ex: 3f9a2b"
                onChange={(e) => setDraft({ ...draft, cakto_offer_id: e.target.value })}
              />
            </div>
            <div>
              <Label>Link de checkout da Cakto</Label>
              <Input
                value={draft.checkout_url ?? ""}
                placeholder="https://pay.cakto.com.br/..."
                onChange={(e) => setDraft({ ...draft, checkout_url: e.target.value })}
              />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={draft.ordem}
                onChange={(e) => setDraft({ ...draft, ordem: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={draft.descricao ?? ""}
              onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={draft.ativo}
                onCheckedChange={(v) => setDraft({ ...draft, ativo: v })}
              />
              Ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={draft.destaque}
                onCheckedChange={(v) => setDraft({ ...draft, destaque: v })}
              />
              Destaque
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              <Save className="size-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
