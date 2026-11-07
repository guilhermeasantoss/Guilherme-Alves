# Inventário dos projetos atuais

Fonte consultada: os nove elementos `<article class="project-card">` de `index.html` (linhas 1018–1253).

Seed preparado em `admin/supabase/seed_portfolio_projects.sql`. Prévias visuais (gradiente/vídeo) ficam em `admin/docs/preview-fallbacks.json` para a integração pública — não vão para o banco como capa.

| # | Projeto | Link do projeto | Descrição atual | Tecnologias exibidas | Destaque atual | Prévia atual |
|---|---|---|---|---|---|---|
| 1 | Infocopa | https://info-copa.vercel.app/ | Plataforma de informações sobre a Copa do Mundo com dados em tempo real, classificações e estatísticas dos times. | React, API, Football | Não | Prévia estilizada `//`; gradiente `#060d1a` → `#0a1f35`; domínio `info-copa.vercel.app`. |
| 2 | Atlético Mineiro | https://atletico-mineiro-three.vercel.app/ | Site fan-made do Atlético Mineiro com design moderno, informações do clube e destaque para o Galo. | JavaScript, CSS3, Sports | Não | Prévia estilizada `//`; gradiente `#060d1a` → `#1a0a0a`; texto visual `atletico-mineiro.vercel.app`. |
| 3 | MoviePlay | https://movieplay-filmes.vercel.app/ | Aplicação de catálogo de filmes com busca, filtros por gênero e detalhes completos de cada título. | React, TMDB API, Movies | Não | Prévia estilizada `//`; gradiente `#06080f` → `#0d0a1a`; domínio `movieplay-filmes.vercel.app`. |
| 4 | Saborify | https://saborify-receitas.vercel.app/ | Plataforma de receitas culinárias com busca por ingredientes, categorias e instruções passo a passo. | React, Tailwind, Receitas | Não | Prévia estilizada `//`; gradiente `#060d0a` → `#0a1a0e`; domínio `saborify-receitas.vercel.app`. |
| 5 | Spectrum | https://spectrum-ruddy.vercel.app/ | Plataforma educacional com foco em  adaptação de materiais para crianças neurodivergentes | React, CSS3, Design | Sim; selo `DESTAQUE` | Prévia estilizada `//`; gradiente `#080610` → `#150a2a`; domínio `spectrum-ruddy.vercel.app`. |
| 6 | Life Up - Suplementos | Nenhum link de projeto cadastrado no card. | Plataforma completa para acesso e compartilhamento de suplementos acadêmicos com sistema de cadastro, upload de materiais e painel administrativo. | Full Stack, Projeto Integrador, Acadêmico | Sim; selo `DESTAQUE` | Vídeo local `lifeup-video.mp4`, player com controles e overlay `VER VÍDEO`; não é imagem nem link de demonstração. |
| 7 | CANES AI | https://canes-ai.vercel.app/ | Assistente pessoal inteligente para organizar tarefas, esclarecer dúvidas, estudar e resolver problemas. | JavaScript, Cohere AI, Assistente | Sim; selo `DESTAQUE` | Prévia estilizada `//`; gradiente `#07131f` → `#102c3a`; domínio `canes-ai.vercel.app`. |
| 8 | Urban Barber | https://urban-barber-six.vercel.app/ | Site moderno para barbearia com apresentação de serviços, equipe, infraestrutura, avaliações e agendamento. | HTML5, CSS3, JavaScript | Não | Prévia estilizada `//`; gradiente `#17110b` → `#3a2414`; domínio `urban-barber-six.vercel.app`. |
| 9 | Controle de Gastos Financeiros | https://cgasto-financeiro.vercel.app/index.html | Aplicação para organizar gastos pessoais, acompanhar movimentações e ter mais controle sobre a vida financeira. | HTML5, CSS3, JavaScript | Sim; classe `featured`, selo atual `NOVO` | Prévia estilizada `//`; gradiente `#071a15` → `#0b3a2c`; domínio `cgasto-financeiro.vercel.app`. |

## Dados que não constam nos cards

Os cards não fornecem URLs de repositório, categorias, datas de criação, status de desenvolvimento, descrições completas separadas, nem imagens de capa. Também não há URL de projeto para Life Up. Esses campos não devem ser inventados durante a migração: precisam ser confirmados ou mantidos opcionais conforme a validação do modelo antes da importação.

As prévias com gradiente são conteúdo visual existente, não arquivos de imagem. A etapa de migração deve preservá-las como estilo de fallback, e não criar capas fictícias. O card 9 é marcado como `featured`, embora o texto do selo seja `NOVO`; esse detalhe também deve ser preservado até uma decisão explícita.
