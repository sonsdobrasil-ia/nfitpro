export type HealthyProduct = {
  id: string;
  nome: string;
  categoria: string;
  emoji: string;
  beneficio: string;
};

export const CATEGORIAS = [
  "Proteínas",
  "Frutas",
  "Verduras e legumes",
  "Grãos e cereais",
  "Oleaginosas",
  "Bebidas",
] as const;

export const PRODUTOS_SAUDAVEIS: HealthyProduct[] = [
  { id: "frango", nome: "Peito de frango", categoria: "Proteínas", emoji: "🍗", beneficio: "Proteína magra" },
  { id: "ovos", nome: "Ovos", categoria: "Proteínas", emoji: "🥚", beneficio: "Proteína completa" },
  { id: "salmao", nome: "Salmão", categoria: "Proteínas", emoji: "🐟", beneficio: "Ômega 3" },
  { id: "iogurte", nome: "Iogurte natural", categoria: "Proteínas", emoji: "🥛", beneficio: "Probióticos" },
  { id: "tofu", nome: "Tofu", categoria: "Proteínas", emoji: "🧈", beneficio: "Proteína vegetal" },

  { id: "banana", nome: "Banana", categoria: "Frutas", emoji: "🍌", beneficio: "Energia e potássio" },
  { id: "maca", nome: "Maçã", categoria: "Frutas", emoji: "🍎", beneficio: "Fibras" },
  { id: "abacate", nome: "Abacate", categoria: "Frutas", emoji: "🥑", beneficio: "Gordura boa" },
  { id: "mirtilo", nome: "Mirtilo", categoria: "Frutas", emoji: "🫐", beneficio: "Antioxidantes" },
  { id: "laranja", nome: "Laranja", categoria: "Frutas", emoji: "🍊", beneficio: "Vitamina C" },

  { id: "brocolis", nome: "Brócolis", categoria: "Verduras e legumes", emoji: "🥦", beneficio: "Vitaminas e fibras" },
  { id: "espinafre", nome: "Espinafre", categoria: "Verduras e legumes", emoji: "🥬", beneficio: "Ferro" },
  { id: "cenoura", nome: "Cenoura", categoria: "Verduras e legumes", emoji: "🥕", beneficio: "Vitamina A" },
  { id: "tomate", nome: "Tomate", categoria: "Verduras e legumes", emoji: "🍅", beneficio: "Licopeno" },
  { id: "batata-doce", nome: "Batata-doce", categoria: "Verduras e legumes", emoji: "🍠", beneficio: "Carbo de baixo índice" },

  { id: "aveia", nome: "Aveia", categoria: "Grãos e cereais", emoji: "🌾", beneficio: "Fibra e saciedade" },
  { id: "arroz-integral", nome: "Arroz integral", categoria: "Grãos e cereais", emoji: "🍚", beneficio: "Energia duradoura" },
  { id: "quinoa", nome: "Quinoa", categoria: "Grãos e cereais", emoji: "🥣", beneficio: "Proteína e fibras" },
  { id: "feijao", nome: "Feijão", categoria: "Grãos e cereais", emoji: "🫘", beneficio: "Ferro e proteína" },
  { id: "lentilha", nome: "Lentilha", categoria: "Grãos e cereais", emoji: "🍲", beneficio: "Proteína vegetal" },

  { id: "castanhas", nome: "Castanha-do-pará", categoria: "Oleaginosas", emoji: "🌰", beneficio: "Selênio" },
  { id: "amendoas", nome: "Amêndoas", categoria: "Oleaginosas", emoji: "🥜", beneficio: "Gordura boa" },
  { id: "chia", nome: "Chia", categoria: "Oleaginosas", emoji: "🫙", beneficio: "Ômega 3 e fibras" },
  { id: "pasta-amendoim", nome: "Pasta de amendoim", categoria: "Oleaginosas", emoji: "🥄", beneficio: "Energia" },

  { id: "agua-coco", nome: "Água de coco", categoria: "Bebidas", emoji: "🥥", beneficio: "Hidratação" },
  { id: "cha-verde", nome: "Chá verde", categoria: "Bebidas", emoji: "🍵", beneficio: "Antioxidante" },
  { id: "cafe", nome: "Café sem açúcar", categoria: "Bebidas", emoji: "☕", beneficio: "Foco e energia" },
];
