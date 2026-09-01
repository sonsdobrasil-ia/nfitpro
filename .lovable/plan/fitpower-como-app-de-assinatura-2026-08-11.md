# FitPower como app de assinatura

Transformar o app de "venda de eBooks avulsos" em **acesso por plano**: quem assina libera toda a biblioteca de eBooks, o plano de 4 semanas, o timer, progresso e certificado.

## Como fica para o visitante

- **Home**: deixa de ser vitrine de compra. Passa a mostrar a proposta do FitPower + a estante como catálogo ("o que você recebe no plano"), sem preço por eBook.
- **Página do eBook** (`/ebooks/:id`): vira página de apresentação com capa, descrição, categoria, páginas e **prévia** (primeiras páginas do PDF). Sem preço individual; o CTA passa a ser "Assinar o FitPower".
- **Nova página `/planos`**: comparação Mensal x Anual, lista de benefícios e botão de checkout.

## Planos

- **Mensal — R$ 9,90/mês**
- **Anual — R$ 99,00/ano** (2 meses grátis; valor ajustável antes de criar os produtos)
- Um único nível de acesso: assinando, tudo liberado.

## Como fica para o assinante e para o usuário logado sem plano

- Logado **sem** assinatura: vê a biblioteca e a prévia, com aviso "Assine para ler completo" e atalho para `/planos`. Treinos, progresso e certificado ficam bloqueados com o mesmo aviso.
- Logado **com** assinatura ativa: tudo como é hoje, sem mudanças.
- Perfil ganha um bloco "Minha assinatura" (plano, status, próxima cobrança, gerenciar/cancelar).
- Admin ganha, em Faturamento, a lista de assinantes com plano e status.

## Prévia gratuita

Prévia = **10% das páginas do PDF, no mínimo 3 e no máximo 10**. Ao passar do limite, o leitor mostra um cartão de bloqueio com CTA de assinatura em vez da próxima página.

## Pagamento

Usar a integração de pagamentos nativa do Lovable com **Stripe** (assinatura recorrente). O ambiente de teste é criado na hora para validar o fluxo sem dinheiro real; cobrança real depois exige a verificação da conta. Requer plano Pro na sua conta Lovable.

Ordem de execução: habilitar pagamentos → criar os dois produtos/preços → implementar checkout + webhook → aplicar os bloqueios de acesso no app.

## Detalhes técnicos

**Banco**
- Nova tabela `subscribers` (user_id, email, stripe_customer_id, plano `mensal|anual`, status, current_period_end) com RLS: o usuário lê a própria linha; escrita só pelo webhook (service role); admin lê todas. GRANTs para `authenticated`/`service_role`.
- `ebooks`: coluna `preco` deixa de ser usada na interface pública (mantida no banco, sem exibição).

**Acesso**
- Server function `getMySubscription` com `requireSupabaseAuth` retornando `{ active, plano, current_period_end }`.
- Hook `useSubscription` para as telas; guard leve `RequireSubscription` (componente de aviso, não redireciona) usado em Treinos, Workout, Progresso e leitura completa do eBook.
- Server function `createCheckout` (mensal/anual) e `openCustomerPortal` para gerenciar a assinatura.
- Server route pública `src/routes/api/public/webhooks/stripe.ts` verificando assinatura do provedor e gravando/atualizando `subscribers` com o client admin carregado dentro do handler.

**Frontend**
- `src/routes/planos.tsx` (nova, pública, com `head()` próprio).
- `src/routes/index.tsx`: remove preço/CTA de compra, adiciona seção de planos.
- `src/routes/ebooks.$id.tsx`: remove bloco de preço/compra, adiciona prévia e CTA de assinatura.
- `src/routes/_authenticated/ebook.$id.tsx`: limite de páginas da prévia para não assinantes.
- `src/routes/_authenticated/profile.tsx`: bloco "Minha assinatura".
- `src/routes/_authenticated/admin/billing.tsx`: lista de assinantes.
