import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoverImage } from "@/components/CoverImage";
import { type ShelfBook } from "@/lib/shelf";
import { PLANOS, BENEFICIOS } from "@/lib/plans";
import { ChevronRight, Zap, Timer, Trophy, BookOpen, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
  head: () => ({
    meta: [
      { title: "FitPower — assinatura de eBooks e treinos de corrida" },
      {
        name: "description",
        content:
          "Assine o FitPower por R$ 9,90/mês e libere todos os eBooks de corrida, treino e nutrição, o plano de 4 semanas e o certificado de 5km.",
      },
      { property: "og:title", content: "FitPower — assinatura de eBooks e treinos de corrida" },
      {
        property: "og:description",
        content: "Um plano, biblioteca completa de eBooks e o método que leva do sofá aos 5km.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ebooks")
        .select("id, titulo, subtitulo, descricao, categoria, paginas, preco, capa_url, pdf_url")
        .eq("publicado", true)
        .order("created_at", { ascending: false });
      setBooks(((data as any[]) ?? []).filter((b) => b.pdf_url) as ShelfBook[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="bg-background">
      <main className="px-5 py-10 max-w-5xl mx-auto w-full">
        <section>
          <span className="inline-flex items-center rounded-full bg-accent/20 text-accent-foreground text-xs font-semibold px-3 py-1">
            Assinatura única · tudo liberado
          </span>
          <h1 className="text-4xl font-bold leading-tight max-w-xl mt-4">
            Do <span className="text-primary">sofá aos 5km</span> em 30 dias.
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl">
            Uma assinatura libera a biblioteca completa de eBooks FitPower, o plano de 4 semanas e o
            timer guiado. Sem comprar título por título.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3 max-w-3xl">
            <Feature icon={Timer} title="Timer guiado" desc="Alterna correr e caminhar com aviso sonoro." />
            <Feature icon={Zap} title="Plano de 4 semanas" desc="12 treinos progressivos e sem desistência." />
            <Feature icon={Trophy} title="Certificado 5km" desc="Conquiste e exporte sua jornada em PDF." />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/planos"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold px-6 py-3.5 shadow-glow active:scale-[0.98] transition"
            >
              Assinar por R$ 9,90/mês <ChevronRight className="size-5" />
            </Link>
            <a
              href="#estante"
              className="inline-flex items-center rounded-2xl border-2 border-border font-semibold px-6 py-3.5"
            >
              Ver a biblioteca
            </a>
          </div>
        </section>

        <section id="estante" className="mt-16">
          <div className="flex items-center gap-3">
            <BookOpen className="size-6 text-primary" />
            <h2 className="text-2xl font-bold">Biblioteca incluída no plano</h2>
          </div>
          <p className="text-muted-foreground mt-1">
            Todos estes títulos ficam liberados assim que você assina — e novos entram sem custo
            extra.
          </p>

          {loading ? (
            <p className="mt-8 text-sm text-muted-foreground">Carregando...</p>
          ) : books.length === 0 ? (
            <div className="mt-6 rounded-2xl border bg-card p-6 text-center shadow-soft">
              <p className="font-semibold">Nenhum eBook disponível ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Novos títulos aparecerão aqui em breve.
              </p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((b) => (
                <li key={b.id}>
                  <Link
                    to="/ebooks/$id"
                    params={{ id: b.id }}
                    className="group block rounded-2xl border bg-card p-4 shadow-soft h-full transition hover:shadow-glow"
                  >
                    <CoverImage
                      value={b.capa_url}
                      alt={`Capa do eBook ${b.titulo}`}
                      className="w-full aspect-[3/4] rounded-xl object-cover bg-muted"
                      fallback={<div className="w-full aspect-[3/4] rounded-xl bg-muted" />}
                    />
                    <p className="mt-3 font-bold leading-snug">{b.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.categoria} · {b.paginas ?? 0} páginas
                    </p>
                    <p className="mt-2 text-sm font-semibold text-secondary">Incluído no plano</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-16 rounded-2xl border bg-card p-6 sm:p-8 shadow-soft">
          <h2 className="text-2xl font-bold">Um plano, dois jeitos de pagar</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {PLANOS.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border p-5 ${p.destaque ? "border-primary" : ""}`}
              >
                <p className="font-bold">{p.nome}</p>
                <p className="mt-1">
                  <span className="text-3xl font-display font-bold text-primary">
                    {p.precoLabel}
                  </span>
                  <span className="text-muted-foreground">{p.periodo}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{p.detalhe}</p>
              </div>
            ))}
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex gap-2 text-sm">
                <Check className="size-4 text-secondary mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/planos"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold px-6 py-3.5"
          >
            Ver planos <ChevronRight className="size-5" />
          </Link>
        </section>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 items-start rounded-2xl border bg-card p-4 shadow-soft">
      <div className="size-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
        <Icon className="size-5" />
      </div>
      <div>
        <h3 className="font-bold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
