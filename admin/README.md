# Painel administrativo do portfólio

Aplicação React + Vite isolada em `admin/`. O portfólio público continua sendo o `index.html` estático existente; esta entrega não altera esse arquivo nem implementa o CRUD.

## Desenvolvimento local

Requisitos: Node.js `>=20.19.0` e npm.

```powershell
cd admin
npm ci
Copy-Item .env.example .env.local
```

Preencha `admin/.env.local` com as credenciais públicas do projeto Supabase:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Depois execute:

```powershell
npm run dev
```

Abra `http://127.0.0.1:5173/admin/`. Para validar a compilação, execute `npm run build`; `npm run preview` serve a versão compilada localmente.

Somente a URL e a chave pública `anon`/publishable pertencem ao frontend. Nunca use `service_role` ou outra chave secreta em variáveis `VITE_*`, no navegador ou no repositório.

## Preparação do Supabase

1. Crie um projeto Supabase e execute `supabase/migrations/20261107003633_initial_projects.sql` no SQL Editor ou por meio do Supabase CLI.
2. Desative o cadastro público de usuários nas configurações de Auth. Crie ou convide a conta administrativa pelo painel do Supabase; o frontend não oferece cadastro.
3. Na tabela `auth.users`, localize o UUID (`id`) da conta autorizada e cadastre somente esse UID na allowlist pelo SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('<UUID-DA-CONTA-AUTORIZADA>');
   ```

4. Configure as variáveis públicas acima localmente e no projeto Vercel.

A autorização não depende de endereço de e-mail nem de uma condição visual no navegador. A rota consulta `is_project_admin()` e as políticas RLS repetem essa verificação no banco para cada operação. A tabela `admin_users` não concede leitura nem escrita às roles `anon` e `authenticated`; novos administradores só podem ser autorizados por um operador com acesso privilegiado ao banco. Não conceda nem use a `service_role` no painel.

A migration permite leitura pública somente de registros publicados, escrita em `projects` apenas para UIDs autorizados e upload/alteração/exclusão apenas por administradores no bucket `project-images`. O bucket é público para leitura das imagens publicadas, limita arquivos a 5 MiB e aceita JPEG, PNG, WebP e AVIF. As capas são opcionais, permitindo manter as prévias visuais estilizadas atuais.

O campo `status` aceita `in_development`, `completed` ou `paused`. A migration também acrescenta `sort_order` para permitir ordenação manual sem depender apenas das datas.

## Painel de projetos

Após configurar as variáveis e aplicar a migration, entre em `/admin/` com a conta autorizada. O dashboard e a página `/admin/projects` consultam registros pela sessão autenticada e RLS. A listagem inclui pesquisa por nome, filtros por categoria/status/publicação, ordenação por ordem manual/data/nome, edição, prévia e exclusão com confirmação. O formulário valida campos e URLs, gera o slug a partir do título, suporta imagem opcional ou URL externa, mantém prévia estilizada sem capa e permite salvar como rascunho ou publicar. A publicação marca o registro no banco; a seção pública atual ainda permanece estática até a etapa separada de integração.

Uploads usam apenas o bucket `project-images` e a sessão do usuário; novas capas são limitadas no cliente e no bucket. Imagens substituídas são removidas após salvar. Se uma exclusão do arquivo falhar depois de salvar o projeto, o painel informa que o registro foi salvo e que a limpeza da imagem precisa de atenção.

## Vercel

`vercel.json` mantém a raiz do projeto como diretório de publicação e executa o build da aplicação administrativa. As regras de rota encaminham `/admin`, `/admin/*` e os assets para `admin-dist/` antes da busca por arquivos estáticos, evitando que o `admin/index.html` de desenvolvimento seja servido no lugar do bundle compilado. O Vite usa `/admin/` como base dos assets. O `index.html` e os recursos públicos existentes continuam na raiz.

No projeto Vercel conectado ao repositório, mantenha **Root Directory** na raiz do repositório e confira as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em cada ambiente necessário. A configuração versionada define instalação, build e roteamento; não é necessário alterar a rota do site público nem configurar um segundo projeto Vercel.

## Listagem pública e recuperação

O `index.html` da raiz carrega `js/projects.js`, que:

1. Consulta os projetos `published = true` no Supabase (chave anon/publishable em `js/config.js`).
2. Se a consulta falhar ou vier vazia, usa `data/projects-fallback.json`.
3. Se o JSON também falhar, mantém os cards estáticos já presentes no HTML.

Prévias em gradiente/vídeo (quando não há `image_url`) vêm de `data/preview-fallbacks.json`, casadas pelo `slug`.

Para regenerar config + snapshot localmente:

```powershell
cd admin
npm run sync:public
```

No deploy da Vercel, o build roda `sync:public --soft`: atualiza o snapshot quando o Supabase responde com publicados; se a consulta falhar ou vier vazia, **não** sobrescreve o JSON anterior e o build segue.

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no projeto Vercel para o sync de build e para o admin. O site público usa `js/config.js` gerado a partir dessas variáveis.

## Próximas etapas

- Validar a listagem pública localmente e no deploy.
- Publicar na Vercel após autorização.
