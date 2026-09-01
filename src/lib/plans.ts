export type PlanoId = "mensal" | "anual";

export type PlanoInfo = {
  id: PlanoId;
  nome: string;
  preco: number;
  precoLabel: string;
  periodo: string;
  detalhe: string;
  destaque?: boolean;
};

export const PLANOS: PlanoInfo[] = [
  {
    id: "mensal",
    nome: "Mensal",
    preco: 9.9,
    precoLabel: "R$ 9,90",
    periodo: "/mês",
    detalhe: "Cancele quando quiser.",
  },
  {
    id: "anual",
    nome: "Anual",
    preco: 99,
    precoLabel: "R$ 99,00",
    periodo: "/ano",
    detalhe: "Equivale a R$ 8,25/mês — 2 meses grátis.",
    destaque: true,
  },
];

export const BENEFICIOS = [
  "Biblioteca completa de eBooks FitPower, sempre com novos títulos",
  "Plano de 4 semanas com 12 treinos progressivos",
  "Timer guiado que alterna correr e caminhar com aviso sonoro",
  "Histórico, gráficos de evolução e sequência de treinos",
  "Certificado digital dos seus primeiros 5km",
  "Progresso de leitura salvo em todos os dispositivos",
];

/** Prévia gratuita: 10% das páginas, mínimo 3 e máximo 10. */
export function previewPages(total: number) {
  if (!total || total <= 0) return 3;
  return Math.max(3, Math.min(10, Math.round(total * 0.1)));
}
