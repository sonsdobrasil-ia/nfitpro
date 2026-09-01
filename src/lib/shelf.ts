export type ShelfBook = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  descricao: string | null;
  categoria: string | null;
  paginas: number | null;
  preco: number | null;
  capa_url: string | null;
};

export function formatPreco(preco: number | null) {
  if (preco == null || preco <= 0) return "Grátis";
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
