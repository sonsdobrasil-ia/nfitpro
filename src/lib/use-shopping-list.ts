import { useCallback, useEffect, useState } from "react";

export type ShoppingItem = {
  id: string;
  nome: string;
  emoji: string;
  categoria: string;
  quantidade: number;
  comprado: boolean;
};

const KEY = "nfitrun:shopping-list";

function load(): ShoppingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ShoppingItem[]) : [];
  } catch {
    return [];
  }
}

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* armazenamento indisponível */
    }
  }, [items, ready]);

  const addItem = useCallback((item: Omit<ShoppingItem, "quantidade" | "comprado">) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === item.id);
      if (found) return prev.map((i) => (i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i));
      return [...prev, { ...item, quantidade: 1, comprado: false }];
    });
  }, []);

  const setQuantidade = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantidade: i.quantidade + delta } : i))
        .filter((i) => i.quantidade > 0),
    );
  }, []);

  const toggle = useCallback((id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, comprado: !i.comprado } : i)));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, ready, addItem, setQuantidade, toggle, remove, clear };
}
