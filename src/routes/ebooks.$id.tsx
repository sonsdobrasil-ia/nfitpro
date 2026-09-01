import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoverImage } from "@/components/CoverImage";
import { type ShelfBook } from "@/lib/shelf";
import { previewPages } from "@/lib/plans";
import { ArrowLeft, Check, BookOpen, Sparkles } from "lucide-react";

export const Route = createFileRoute("/ebooks/$id")({
  ssr: false,
  component: SalesPage,
  head: () => ({
    meta: [
      { title: "eBook FitPower — incluído na assinatura" },
      {
        name: "description",
        content:
          "Conheça este eBook FitPower: conteúdo, número de páginas e prévia gratuita. Leitura completa liberada com a assinatura FitPower.",
      },
      { property: "og:title", content: "eBook FitPower — incluído na assinatura" },
      {
        property: "og:description",
        content: "Prévia gratuita e leitura completa com o plano FitPower.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function SalesPage() {
  const { id } = Route.useParams();
  const [book, setBook] = useState<ShelfBook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("ebooks")
        .select("id, titulo, subtitulo, descricao, categoria, paginas, preco, capa_url")
        .eq("id", id)
        .eq("publicado", true)
        .maybeSingle();
      if (!alive) return;
      setBook((data as any) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return <p className="px-5 py-10 max-w-4xl mx-auto text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!book) {
    return (
      <div className="px-5 py-16 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold">eBook não encontrado</h1>
        <p className="text-muted-foreground mt-2">Este título não está disponível.</p>
        <Link to="/" className="mt-6 inline-flex rounded-2xl bg-primary text-primary-foreground font-bold px-5 py-3">
          Voltar para a biblioteca
        </Link>
      </div>
    );
  }

  const previa = previewPages(book.paginas ?? 0);

  const beneficios = [
    "Leitura completa dentro do app, no celular ou computador",
    "Progresso de leitura salvo automaticamente",
    "Acesso ao plano de 4 semanas e ao timer guiado FitPower",
    "Toda a biblioteca FitPower liberada na mesma assinatura",
  ];

  return (
    <div className="px-5 py-8 max-w-4xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Biblioteca
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[280px_1fr] items-start">
        <CoverImage
          value={book.capa_url}
          alt={`Capa do eBook ${book.titulo}`}
          className="w-full aspect-[3/4] rounded-2xl object-cover bg-muted shadow-soft"
          fallback={<div className="w-full aspect-[3/4] rounded-2xl bg-muted" />}
        />

        <div className="min-w-0">
          {book.categoria && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 text-secondary text-xs font-semibold px-3 py-1">
              <BookOpen className="size-3" /> {book.categoria}
            </span>
          )}
          <h1 className="text-3xl font-bold mt-3">{book.titulo}</h1>
          {book.subtitulo && <p className="text-lg text-muted-foreground mt-1">{book.subtitulo}</p>}

          <p className="mt-4 whitespace-pre-line text-muted-foreground">
            {book.descricao ?? "Um guia prático FitPower para você evoluir na corrida."}
          </p>

          <ul className="mt-6 space-y-2">
            {beneficios.map((b) => (
              <li key={b} className="flex gap-2 text-sm">
                <Check className="size-4 text-secondary mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border bg-card p-5 shadow-soft">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 text-accent-foreground text-xs font-semibold px-3 py-1">
              <Sparkles className="size-3" /> Incluído na assinatura
            </span>
            <p className="mt-3 text-sm text-muted-foreground">
              Este eBook não é vendido separadamente. Com o plano FitPower (a partir de R$ 9,90/mês)
              você lê este e todos os outros títulos da biblioteca.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {book.paginas ?? 0} páginas · prévia gratuita das {previa} primeiras
            </p>
            <Link
              to="/planos"
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-2xl bg-primary text-primary-foreground font-bold py-4 text-lg shadow-glow active:scale-[0.98] transition"
            >
              Assinar e ler agora
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="mt-2 block text-center text-sm text-muted-foreground"
            >
              Criar conta e ler a prévia grátis
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
