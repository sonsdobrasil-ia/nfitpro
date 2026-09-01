import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoverImage } from "@/components/CoverImage";
import { BookOpen, Lock } from "lucide-react";
import { useHasAccess } from "@/components/SubscriptionGate";


export const Route = createFileRoute("/_authenticated/ebook/")({
  component: Ebook,
  head: () => ({
    meta: [
      { title: "Biblioteca de eBooks | FitPower" },
      {
        name: "description",
        content:
          "Leia os eBooks FitPower direto no app e acompanhe o percentual de leitura de cada título.",
      },
      { property: "og:title", content: "Biblioteca de eBooks | FitPower" },
      {
        property: "og:description",
        content: "Seus eBooks FitPower com progresso de leitura salvo automaticamente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Biblioteca = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  paginas: number | null;
  capa_url: string | null;
  percentual: number;
};

function Ebook() {
  const { hasAccess, loading: loadingAccess } = useHasAccess();
  const [biblioteca, setBiblioteca] = useState<Biblioteca[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setLoading(false);

      const [{ data: books }, { data: progresso }] = await Promise.all([
        supabase
          .from("ebooks")
          .select("id, titulo, descricao, categoria, paginas, capa_url, pdf_url")
          .eq("publicado", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("ebook_reading_progress")
          .select("ebook_id, percentual")
          .eq("user_id", u.user.id),
      ]);
      const map = new Map(
        ((progresso as any[]) ?? []).map((p) => [p.ebook_id, Number(p.percentual ?? 0)]),
      );
      setBiblioteca(
        ((books as any[]) ?? [])
          .filter((b) => b.pdf_url)
          .map((b) => ({ ...b, percentual: map.get(b.id) ?? 0 })),
      );
      setLoading(false);
    })();
  }, []);

  return (
    <div className="px-5 pt-8 pb-4 max-w-xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">eBooks</h1>
          <p className="text-muted-foreground mt-1">Sua biblioteca FitPower</p>
        </div>
        <BookOpen className="size-8 text-primary mt-1" />
      </header>

      {!loadingAccess && !hasAccess && (
        <Link
          to="/planos"
          className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-card p-4 shadow-soft"
        >
          <Lock className="size-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">Você está no modo prévia</p>
            <p className="text-xs text-muted-foreground">
              Assine para ler todos os eBooks por completo · a partir de R$ 9,90
            </p>
          </div>
          <span className="text-muted-foreground">›</span>
        </Link>
      )}



      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Carregando...</p>
      ) : biblioteca.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-card p-6 text-center shadow-soft">
          <p className="font-semibold">Nenhum eBook disponível ainda</p>
          <p className="text-sm text-muted-foreground mt-1">
            Novos títulos aparecerão aqui assim que forem publicados.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3 mb-6">
          {biblioteca.map((b) => (
            <li key={b.id}>
              <Link
                to="/ebook/$id"
                params={{ id: b.id }}
                className="flex gap-3 rounded-2xl bg-card border p-3 shadow-soft"
              >
                <CoverImage
                  value={b.capa_url}
                  alt={b.titulo}
                  className="h-24 w-18 rounded-lg object-cover bg-muted shrink-0"
                  fallback={<div className="h-24 w-16 rounded-lg bg-muted shrink-0" />}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{b.titulo}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{b.descricao}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {b.categoria} · {b.paginas ?? 0} páginas
                  </p>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-energy"
                      style={{ width: `${Math.round(b.percentual)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {Math.round(b.percentual)}% lido
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
