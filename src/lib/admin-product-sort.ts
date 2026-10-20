export type ProductSort = "recentes" | "antigos" | "nome" | "categoria" | "preco-menor" | "preco-maior";

type SortableProduct = {
  titulo: string;
  categoria: string | null;
  preco: number | null;
};

// Input is already ordered by created_at descending by the existing query.
export function sortAdminProducts<T extends SortableProduct>(products: T[], order: ProductSort): T[] {
  const result = [...products];
  const byName = (a: T, b: T) => a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base", numeric: true });
  switch (order) {
    case "antigos": return result.reverse();
    case "nome": return result.sort(byName);
    case "categoria": return result.sort((a, b) => (a.categoria ?? "").localeCompare(b.categoria ?? "", "pt-BR") || byName(a, b));
    case "preco-menor": return result.sort((a, b) => Number(a.preco ?? 0) - Number(b.preco ?? 0) || byName(a, b));
    case "preco-maior": return result.sort((a, b) => Number(b.preco ?? 0) - Number(a.preco ?? 0) || byName(a, b));
    default: return result;
  }
}