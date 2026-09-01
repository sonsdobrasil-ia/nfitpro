# FitPower: Couch to 5K

Crie um aplicativo web completo do tipo PWA (Progressive Web App) chamado "FitPower", um treinador de corrida para iniciantes que leva a pessoa do sofá aos 5km em 30 dias. Construa TUDO de uma vez, com frontend, autenticação e banco de dados usando Supabase. Siga rigorosamente as especificações abaixo.

## STACK

- React + Vite + TypeScript + Tailwind CSS

- Supabase para autenticação (e-mail/senha) e banco de dados

- Configurar como PWA instalável (manifest.json + service worker, ícone e tela inicial)

- Mobile-first, responsivo, foco em uso no celular

## IDENTIDADE VISUAL

- Marca: FitPower (logo com tipografia forte, sensação de energia e potência)

- Cor primária (ações/botões): laranja #FF6B35

- Cor secundária (progresso/check): verde #2EC4B6

- Destaque/CTA: amarelo #FFD23F

- Texto: cinza-grafite #2B2B2B

- Fundo claro: #FAF9F6 | Fundo escuro: #1A1A2E

- Fonte títulos: Poppins (bold) | Fonte corpo: Inter

- Cantos arredondados, sombras suaves, visual moderno e motivacional

- Suporte a modo claro e escuro

## AUTENTICAÇÃO (usuário/senha via Supabase)

- Telas de Cadastro e Login com e-mail e senha

- Recuperação de senha por e-mail

- Rotas protegidas: só acessa o app logado

- Após login, vai para o Dashboard

## ESTRUTURA DE NAVEGAÇÃO (menu inferior fixo - bottom nav)

1. Início (Dashboard)

2. Treinos

3. Progresso

4. eBook

5. Perfil

## 1. DASHBOARD (Início)

- Saudação personalizada ("Olá, [nome]!")

- Logo FitPower no topo

- Card destacando o próximo treino do dia

- Barra de progresso geral do plano (ex.: "Semana 2 de 4")

- Frase motivacional aleatória

- Botão grande laranja "Treinar agora"

- Atalho para o eBook "Do Sofá aos 5km"

## 2. TREINOS

- Plano fixo de 4 semanas, 3 treinos por semana (total 12 treinos):

  - Semana 1: 1 min correr / 2 min caminhar — 20 min (3x)

  - Semana 2: 2 min correr / 2 min caminhar — 22 min (3x)

  - Semana 3: 3 min correr / 1 min caminhar — 25 min (3x)

  - Semana 4: Contínuo — Treino A 20 min, Treino B 25 min, Treino C 30 min

- Lista de treinos em cards, mostrando status (bloqueado / disponível / concluído)

- Ao abrir um treino: TIMER/CRONÔMETRO interativo que alterna automaticamente

  entre blocos de "CORRER" e "CAMINHAR" com aviso sonoro e vibração na troca

- Mostrar contagem regressiva de cada bloco e tempo total

- Botões: iniciar, pausar, parar

- Ao concluir, marcar treino como "concluído" e salvar no banco

- Após o treino, pedir registro: nível de esforço (escala 0 a 10) e observação opcional

## 3. PROGRESSO

- Lista/histórico de todos os treinos realizados (data, semana, duração, esforço)

- Gráfico simples mostrando evolução (treinos concluídos por semana e esforço médio)

- Contadores: total de treinos concluídos, total de minutos corridos, sequência (streak)

- Mensagem de conquista ao concluir cada semana

- Certificado digital "Completei meus 5km com a FitPower" ao concluir o plano

## 4. EBOOK (produto integrado)

- Seção que entrega o eBook "Do Sofá aos 5km" como conteúdo premium do app

- Lista de capítulos navegáveis (leitor interno estilo capítulos expansíveis):

  - Introdução: Por que você nunca conseguiu correr (até agora)

  - Cap 1: Entendendo seu fôlego (o erro que todo iniciante comete)

  - Cap 2: O Protocolo FitPower de 30 dias

  - Cap 3: Como executar cada treino sem desistir

  - Cap 4: A mente do corredor (motivação e disciplina)

  - Cap 5: Correndo no clima do Brasil (calor, hidratação, horários)

  - Cap 6: Seu primeiro 5km e o que vem depois

  - Bônus: Checklists, alongamentos e o Teste da Conversa

- Cada capítulo abre o texto completo dentro do app, com boa tipografia de leitura

- Botão "Baixar eBook em PDF" (gerar com jsPDF)

- Marcar capítulos como lidos (salvar progresso de leitura no banco)

## 5. PERFIL

- Dados do usuário: nome, e-mail, peso (opcional), meta

- Editar perfil

- Configurar LEMBRETES de treino: escolher dias da semana e horário

  (usar notificações do navegador / Notification API do PWA)

- Alternar modo claro/escuro

- Botão "Exportar meu progresso em PDF" (histórico, estatísticas e conquistas, com jsPDF)

- Botão Sair (logout)

## BANCO DE DADOS (Supabase) - criar tabelas:

- profiles: id, user_id, nome, email, peso, meta, dias_lembrete, horario_lembrete, tema

- workout_logs: id, user_id, semana, numero_treino, duracao, esforco (0-10),

  observacao, concluido (bool), data

- ebook_progress: id, user_id, capitulo, lido (bool), data

- Configurar RLS (Row Level Security) para cada usuário ver só seus dados

## FUNCIONALIDADES PWA

- Manifest com nome "FitPower", ícones e cor de tema laranja

- Service worker para funcionar offline (cache do app e do eBook)

- Permitir "Adicionar à tela inicial"

- Lembretes via Notification API

## EXTRA

- Tela de boas-vindas/onboarding no primeiro acesso, apresentando a FitPower e o método

- Frases motivacionais variadas no dashboard

- Animações suaves de transição e feedback ao concluir treino (confete/parabéns)

Gere o app completo e funcional, com dados do plano de treino e os textos do eBook

já populados, pronto para conectar ao Supabase. Organize o código em componentes

reutilizáveis.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fitpowerrun.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/375b51cf-b5fe-4950-9dbd-c7669480db2a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
