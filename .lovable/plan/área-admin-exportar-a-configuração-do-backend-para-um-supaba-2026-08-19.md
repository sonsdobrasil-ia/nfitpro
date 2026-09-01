# Área admin: exportar a configuração do backend para um Supabase externo

Objetivo: uma nova aba em Administração que gere, sob demanda, tudo que é necessário para recriar o backend do FitPower em um Supabase próprio (externo) — sem alterar nada do backend atual.

## Nova aba "Migração" em /admin/migracao

Três blocos na tela:

1. **Estrutura (schema)**
   - Botão "Baixar schema.sql" com o SQL completo pronto para rodar no SQL Editor do Supabase externo: tipo `app_role`, tabelas `profiles`, `user_roles`, `workout_logs`, `ebooks`, `ebook_reading_progress`, `plans`, `subscribers`, `payment_webhook_events`, os GRANTs, RLS e todas as políticas equivalentes às atuais, além das funções `has_role`, `handle_new_user`, `touch_updated_at` e seus triggers.
   - Também cria os buckets `ebook-covers` e `ebook-pdfs` (privados) com as políticas de acesso.

2. **Dados**
   - Lista as tabelas com a contagem de registros.
   - Botão por tabela para baixar CSV, e um botão "Baixar tudo (data.sql)" que gera os `INSERT`s de todas as tabelas na ordem correta de dependência.
   - Aviso claro: usuários de login (autenticação) não são exportados por aqui — no destino eles são recriados via convite/senha, e os `profiles`/`user_roles` só passam a valer depois que os IDs existirem.

3. **Arquivos (Storage)**
   - Lista os arquivos de capas e PDFs com um link assinado para download, além de um `.txt` com todos os caminhos para download em lote.

4. **Checklist de migração**
   - Passo a passo na tela: criar projeto Supabase → rodar `schema.sql` → criar buckets → subir arquivos → rodar `data.sql` → recriar usuários → trocar as variáveis de ambiente do app → reconfigurar o webhook da Cakto.
   - Botão para baixar o checklist em Markdown.

## Segurança

- A rota fica dentro de `/_authenticated/admin`, que já bloqueia quem não é admin.
- A geração roda em funções de servidor que revalidam a role de admin antes de qualquer leitura, então nenhum dado sai para quem não é admin.
- Nenhuma chave de serviço é exposta na tela ou nos arquivos gerados; o `schema.sql` não contém segredos.

## Detalhes técnicos

- Nova aba registrada na navegação do admin (`src/routes/_authenticated/admin/route.tsx`) e rota nova `src/routes/_authenticated/admin/migration.tsx`.
- `src/lib/migration-export.functions.ts` com funções de servidor protegidas: contagem por tabela, dump CSV/SQL por tabela, listagem de arquivos do storage com URLs assinadas.
- O `schema.sql` é um template versionado em `src/lib/migration-schema.ts`, escrito à mão a partir do estado atual do banco, sem depender de introspecção em runtime.
- Downloads são gerados no navegador via Blob a partir do texto retornado pelas funções de servidor.
- Nada do backend atual é alterado: sem migrações, sem mudança de políticas, sem remoção de dados.
