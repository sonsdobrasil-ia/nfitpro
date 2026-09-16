import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Minus, Trash2, ShoppingCart, Check, Search } from "lucide-react";
import { CATEGORIAS, PRODUTOS_SAUDAVEIS } from "@/lib/healthy-products";
import { useShoppingList } from "@/lib/use-shopping-list";

export const Route = createFileRoute("/_authenticated/compras")({
  component: ComprasPage,
  head: () => ({
    meta: [
      { title: "Lista de compras saudáveis | nfitrun" },
      {
        name: "description",
        content:
          "Monte sua lista de compras saudáveis com sugestões de alimentos ricos em proteínas, fibras e vitaminas.",
      },
      { property: "og:title", content: "Lista de compras saudáveis | nfitrun" },
      {
        property: "og:description",
        content: "Sugestões de alimentos saudáveis e lista de compras pronta para o supermercado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ComprasPage() {
  const { items, addItem, setQuantidade, toggle, remove, clear } = useShoppingList();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [novo, setNovo] = useState("");

  const sugestoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return PRODUTOS_SAUDAVEIS.filter(
      (p) =>
        (categoria === "Todas" || p.categoria === categoria) &&
        (!termo || p.nome.toLowerCase().includes(termo)),
    );
  }, [busca, categoria]);

  const naLista = new Set(items.map((i) => i.id));
  const comprados = items.filter((i) => i.comprado).length;

  function adicionarPersonalizado(e: React.FormEvent) {
    e.preventDefault();
    const nome = novo.trim();
    if (!nome) return;
    addItem({ id: `custom-${nome.toLowerCase()}`, nome, emoji: "🛒", categoria: "Outros" });
    setNovo("");
  }

  return (
    <div className="px-5 pt-6 pb-8 max-w-xl mx-auto">
      <header className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <ShoppingCart className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Compras saudáveis</h1>
          <p className="text-sm text-muted-foreground">Monte sua lista para o mercado</p>
        </div>
      </header>

      {/* Lista atual */}
      <section className="mt-6 rounded-2xl bg-card border p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Minha lista</h2>
          {items.length > 0 && (
            <button onClick={clear} className="text-xs text-muted-foreground underline">
              limpar tudo
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sua lista está vazia. Toque nos produtos sugeridos abaixo para adicionar.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              {comprados} de {items.length} itens comprados
            </p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-energy transition-all"
                style={{ width: `${(comprados / items.length) * 100}%` }}
              />
            </div>
            <ul className="mt-4 space-y-2">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-2 rounded-xl border p-2.5">
                  <button
                    onClick={() => toggle(i.id)}
                    aria-label={i.comprado ? `Desmarcar ${i.nome}` : `Marcar ${i.nome} como comprado`}
                    className={`size-7 shrink-0 rounded-lg border flex items-center justify-center ${
                      i.comprado ? "bg-success text-success-foreground border-transparent" : ""
                    }`}
                  >
                    {i.comprado && <Check className="size-4" />}
                  </button>
                  <span className="text-lg">{i.emoji}</span>
                  <span className={`flex-1 text-sm ${i.comprado ? "line-through text-muted-foreground" : "font-medium"}`}>
                    {i.nome}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQuantidade(i.id, -1)}
                      aria-label={`Diminuir ${i.nome}`}
                      className="size-7 rounded-lg border flex items-center justify-center"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">{i.quantidade}</span>
                    <button
                      onClick={() => setQuantidade(i.id, 1)}
                      aria-label={`Aumentar ${i.nome}`}
                      className="size-7 rounded-lg border flex items-center justify-center"
                    >
                      <Plus className="size-3.5" />
                    </button>
                    <button
                      onClick={() => remove(i.id)}
                      aria-label={`Remover ${i.nome}`}
                      className="size-7 rounded-lg text-muted-foreground flex items-center justify-center"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <form onSubmit={adicionarPersonalizado} className="mt-4 flex gap-2">
          <input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder="Adicionar outro item..."
            className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold">
            Adicionar
          </button>
        </form>
      </section>

      {/* Sugestões */}
      <section className="mt-7">
        <h2 className="font-bold">Produtos saudáveis sugeridos</h2>

        <div className="mt-3 relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto"
            className="w-full rounded-xl border bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {["Todas", ...CATEGORIAS].map((c) => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                categoria === c ? "bg-primary text-primary-foreground border-transparent" : "text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-3">
          {sugestoes.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => addItem({ id: p.id, nome: p.nome, emoji: p.emoji, categoria: p.categoria })}
                className="w-full h-full text-left rounded-2xl border bg-card p-3 shadow-soft active:scale-[0.98] transition"
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{p.emoji}</span>
                  <span
                    className={`size-6 rounded-lg flex items-center justify-center ${
                      naLista.has(p.id) ? "bg-success text-success-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {naLista.has(p.id) ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                  </span>
                </div>
                <p className="mt-2 font-semibold text-sm leading-tight">{p.nome}</p>
                <p className="text-xs text-muted-foreground">{p.beneficio}</p>
              </button>
            </li>
          ))}
        </ul>

        {sugestoes.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum produto encontrado.</p>
        )}
      </section>
    </div>
  );
}
