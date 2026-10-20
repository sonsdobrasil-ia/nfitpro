import { describe, expect, test } from "bun:test";
import { sortAdminProducts } from "../src/lib/admin-product-sort";

const products = [
  { titulo: "Treino", categoria: "Corrida", preco: 30 },
  { titulo: "Alimentação", categoria: "Nutrição", preco: 10 },
  { titulo: "Corrida", categoria: "Corrida", preco: 20 },
];

describe("admin product sorting", () => {
  test("newest keeps query order without mutating the input", () => {
    const result = sortAdminProducts(products, "recentes");
    expect(result.map(p => p.titulo)).toEqual(["Treino", "Alimentação", "Corrida"]);
    expect(result).not.toBe(products);
  });
  test("oldest reverses query order", () => {
    expect(sortAdminProducts(products, "antigos").map(p => p.titulo)).toEqual(["Corrida", "Alimentação", "Treino"]);
  });
  test("name sorts alphabetically in Portuguese", () => {
    expect(sortAdminProducts(products, "nome").map(p => p.titulo)).toEqual(["Alimentação", "Corrida", "Treino"]);
  });
  test("category groups products with name tie-breaker", () => {
    expect(sortAdminProducts(products, "categoria").map(p => p.titulo)).toEqual(["Corrida", "Treino", "Alimentação"]);
  });
  test("lower price first", () => {
    expect(sortAdminProducts(products, "preco-menor").map(p => p.preco)).toEqual([10, 20, 30]);
  });
  test("higher price first", () => {
    expect(sortAdminProducts(products, "preco-maior").map(p => p.preco)).toEqual([30, 20, 10]);
  });
});