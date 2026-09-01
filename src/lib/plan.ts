export type WorkoutBlock = { tipo: "correr" | "caminhar" | "aquecimento" | "desaquecimento"; duracao: number /* sec */ };
export type Workout = {
  semana: number;
  numero: number; // 1..3
  id: string; // e.g. "1-1"
  titulo: string;
  descricao: string;
  duracaoMin: number;
  blocos: WorkoutBlock[];
};

const aquece = (s = 180): WorkoutBlock => ({ tipo: "aquecimento", duracao: s });
const desa = (s = 120): WorkoutBlock => ({ tipo: "desaquecimento", duracao: s });

function intervalo(correr: number, caminhar: number, totalMin: number): WorkoutBlock[] {
  const blocos: WorkoutBlock[] = [aquece()];
  let usado = 3 * 60 + 2 * 60; // aquece + desaquece
  while (usado + correr + caminhar <= totalMin * 60) {
    blocos.push({ tipo: "correr", duracao: correr });
    blocos.push({ tipo: "caminhar", duracao: caminhar });
    usado += correr + caminhar;
  }
  blocos.push(desa());
  return blocos;
}

function continuo(totalMin: number): WorkoutBlock[] {
  return [aquece(), { tipo: "correr", duracao: (totalMin - 5) * 60 }, desa()];
}

export const PLANO: Workout[] = [
  // Semana 1: 1 min correr / 2 min caminhar — 20 min
  ...[1, 2, 3].map((n) => ({
    semana: 1, numero: n, id: `1-${n}`,
    titulo: `Semana 1 · Treino ${n}`,
    descricao: "1 min correr / 2 min caminhar — 20 min",
    duracaoMin: 20,
    blocos: intervalo(60, 120, 20),
  })),
  // Semana 2
  ...[1, 2, 3].map((n) => ({
    semana: 2, numero: n, id: `2-${n}`,
    titulo: `Semana 2 · Treino ${n}`,
    descricao: "2 min correr / 2 min caminhar — 22 min",
    duracaoMin: 22,
    blocos: intervalo(120, 120, 22),
  })),
  // Semana 3
  ...[1, 2, 3].map((n) => ({
    semana: 3, numero: n, id: `3-${n}`,
    titulo: `Semana 3 · Treino ${n}`,
    descricao: "3 min correr / 1 min caminhar — 25 min",
    duracaoMin: 25,
    blocos: intervalo(180, 60, 25),
  })),
  // Semana 4
  { semana: 4, numero: 1, id: "4-1", titulo: "Semana 4 · Treino A", descricao: "Corrida contínua — 20 min", duracaoMin: 20, blocos: continuo(20) },
  { semana: 4, numero: 2, id: "4-2", titulo: "Semana 4 · Treino B", descricao: "Corrida contínua — 25 min", duracaoMin: 25, blocos: continuo(25) },
  { semana: 4, numero: 3, id: "4-3", titulo: "Semana 4 · Treino C", descricao: "Corrida contínua — 30 min · 5km!", duracaoMin: 30, blocos: continuo(30) },
];

export const FRASES = [
  "Cada passo te aproxima da sua melhor versão.",
  "O corpo alcança o que a mente acredita.",
  "Não pare quando estiver cansado, pare quando terminar.",
  "Disciplina é a ponte entre metas e conquistas.",
  "Você é mais forte do que pensa, FitPower!",
  "Lento é mais rápido do que parado.",
  "5km é só o começo da sua nova vida.",
  "Hoje é o dia. Lace o tênis e vai!",
];

export function workoutKey(semana: number, numero: number) { return `${semana}-${numero}`; }
