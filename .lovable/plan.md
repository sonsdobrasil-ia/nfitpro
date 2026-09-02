# Leitura do eBook em HTML + correção do PDF

## O que foi verificado

- Existe 1 eBook cadastrado ("Do Sofá aos 5km em 30 Dias") com `pdf_url = pdfs/9c87f297-...pdf` e `html_url = null` — ou seja, nenhum HTML foi gerado até hoje.
- A migração que adicionou o suporte a HTML usa `CREATE POLICY IF NOT EXISTS`, sintaxe que o Postgres não aceita. A coluna `html_url` existe, mas as políticas de acesso do armazenamento de HTML provavelmente não foram criadas, e a própria pasta de arquivos HTML (`ebook-html`) nunca foi criada (a migração deixou isso como tarefa manual).
- Resultado prático: a geração do HTML falha silenciosamente no admin e o leitor sempre cai no PDF; quando o PDF também não pode ser assinado, aparece o erro de "arquivo não encontrado".

## O que será feito

### 1. Corrigir o armazenamento (backend)
- Nova migração que cria de fato a pasta privada `ebook-html`.
- Recriar as políticas de acesso com sintaxe válida (`DROP POLICY IF EXISTS` + `CREATE POLICY`): leitura para usuários autenticados, escrita/atualização/exclusão para admin.

### 2. Corrigir o cadastro do PDF no admin
- Validar, logo após o upload, que o arquivo realmente existe no armazenamento antes de salvar o caminho no banco.
- Mensagens de erro claras (em vez de falha silenciosa) quando o upload ou a assinatura de URL falhar.
- Ao abrir um eBook cujo PDF não é encontrado, mostrar aviso explícito com o caminho esperado, e no admin marcar o item como "PDF ausente" com botão para reenviar.

### 3. Geração do HTML após o upload
- Ao enviar o PDF e salvar o eBook, a conversão para HTML roda automaticamente com barra de progresso ("página X de Y") e o `html_url` é gravado no banco.
- Se a conversão falhar, exibir o motivo real e manter o botão "Gerar HTML" para nova tentativa.
- Regerar o HTML sempre que um novo PDF for enviado (descartando o HTML antigo).

### 4. Leitura sempre pela página HTML
- Assinantes e admin: leitura do HTML completo dentro do app.
- Não assinantes: será gerado também um HTML de prévia com as primeiras páginas (mesmo limite atual: 10% das páginas, mínimo 3 e máximo 10), salvo junto ao HTML completo, e o leitor exibe esse arquivo com o aviso de assinatura ao chegar ao fim.
- O leitor PDF permanece apenas como reserva caso o HTML ainda não exista para aquele título.
- O progresso de leitura continua sendo salvo pela navegação de páginas do HTML.

### 5. Reprocessar o título existente
- Após o ajuste, gerar o HTML (completo e prévia) do eBook já cadastrado e conferir a leitura ponta a ponta.

## Detalhes técnicos

- Migração: `storage.buckets` insert para `ebook-html` (privado) + políticas em `storage.objects`.
- `src/lib/ebook-html.ts`: gerar dois arquivos por eBook — `html/{id}.html` e `html/{id}-preview.html` — reaproveitando o render por página do pdf.js.
- Banco: usar `html_url` para o completo e adicionar `html_preview_url` para a prévia.
- `src/routes/_authenticated/ebook.$id.tsx`: escolher o HTML conforme `access.mode` (`full` vs `preview`) e só cair no PDF quando não houver HTML.
- `src/routes/_authenticated/admin/ebooks.tsx`: verificação pós-upload (`storage.list`), conversão automática com progresso e tratamento de erro visível.
