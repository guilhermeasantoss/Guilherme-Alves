-- Seed dos 9 projetos atuais do index.html.
-- Executar no SQL Editor do Supabase (role privilegiada).
-- Idempotente: não sobrescreve slugs já existentes.
--
-- Defaults documentados (campos ausentes no HTML):
--   category     = 'Projetos'   (nome da seção pública; campo obrigatório)
--   status       = 'completed'  (já exibidos no portfólio; ajuste no admin se precisar)
--   description  = mesmo texto do card (não há descrição longa separada)
--   image_url    = null         (prévias são gradiente/vídeo, não capa)
--   github_url   = null         (não consta nos cards)
--   project_url  = null só no Life Up (sem link de demo)
--   published    = true
--   featured     = conforme classe/selo do HTML (card 09 featured=true, selo "NOVO")
--   sort_order   = 1..9 (data-index)

insert into public.projects (
  title,
  slug,
  short_description,
  description,
  image_url,
  project_url,
  github_url,
  technologies,
  category,
  status,
  featured,
  published,
  sort_order
)
values
  (
    'Infocopa',
    'infocopa',
    'Plataforma de informações sobre a Copa do Mundo com dados em tempo real, classificações e estatísticas dos times.',
    'Plataforma de informações sobre a Copa do Mundo com dados em tempo real, classificações e estatísticas dos times.',
    null,
    'https://info-copa.vercel.app/',
    null,
    array['React', 'API', 'Football'],
    'Projetos',
    'completed',
    false,
    true,
    1
  ),
  (
    'Atlético Mineiro',
    'atletico-mineiro',
    'Site fan-made do Atlético Mineiro com design moderno, informações do clube e destaque para o Galo.',
    'Site fan-made do Atlético Mineiro com design moderno, informações do clube e destaque para o Galo.',
    null,
    'https://atletico-mineiro-three.vercel.app/',
    null,
    array['JavaScript', 'CSS3', 'Sports'],
    'Projetos',
    'completed',
    false,
    true,
    2
  ),
  (
    'MoviePlay',
    'movieplay',
    'Aplicação de catálogo de filmes com busca, filtros por gênero e detalhes completos de cada título.',
    'Aplicação de catálogo de filmes com busca, filtros por gênero e detalhes completos de cada título.',
    null,
    'https://movieplay-filmes.vercel.app/',
    null,
    array['React', 'TMDB API', 'Movies'],
    'Projetos',
    'completed',
    false,
    true,
    3
  ),
  (
    'Saborify',
    'saborify',
    'Plataforma de receitas culinárias com busca por ingredientes, categorias e instruções passo a passo.',
    'Plataforma de receitas culinárias com busca por ingredientes, categorias e instruções passo a passo.',
    null,
    'https://saborify-receitas.vercel.app/',
    null,
    array['React', 'Tailwind', 'Receitas'],
    'Projetos',
    'completed',
    false,
    true,
    4
  ),
  (
    'Spectrum',
    'spectrum',
    'Plataforma educacional com foco em  adaptação de materiais para crianças neurodivergentes',
    'Plataforma educacional com foco em  adaptação de materiais para crianças neurodivergentes',
    null,
    'https://spectrum-ruddy.vercel.app/',
    null,
    array['React', 'CSS3', 'Design'],
    'Projetos',
    'completed',
    true,
    true,
    5
  ),
  (
    'Life Up - Suplementos',
    'life-up-suplementos',
    'Plataforma completa para acesso e compartilhamento de suplementos acadêmicos com sistema de cadastro, upload de materiais e painel administrativo.',
    'Plataforma completa para acesso e compartilhamento de suplementos acadêmicos com sistema de cadastro, upload de materiais e painel administrativo.',
    null,
    null,
    null,
    array['Full Stack', 'Projeto Integrador', 'Acadêmico'],
    'Projetos',
    'completed',
    true,
    true,
    6
  ),
  (
    'CANES AI',
    'canes-ai',
    'Assistente pessoal inteligente para organizar tarefas, esclarecer dúvidas, estudar e resolver problemas.',
    'Assistente pessoal inteligente para organizar tarefas, esclarecer dúvidas, estudar e resolver problemas.',
    null,
    'https://canes-ai.vercel.app/',
    null,
    array['JavaScript', 'Cohere AI', 'Assistente'],
    'Projetos',
    'completed',
    true,
    true,
    7
  ),
  (
    'Urban Barber',
    'urban-barber',
    'Site moderno para barbearia com apresentação de serviços, equipe, infraestrutura, avaliações e agendamento.',
    'Site moderno para barbearia com apresentação de serviços, equipe, infraestrutura, avaliações e agendamento.',
    null,
    'https://urban-barber-six.vercel.app/',
    null,
    array['HTML5', 'CSS3', 'JavaScript'],
    'Projetos',
    'completed',
    false,
    true,
    8
  ),
  (
    'Controle de Gastos Financeiros',
    'controle-de-gastos-financeiros',
    'Aplicação para organizar gastos pessoais, acompanhar movimentações e ter mais controle sobre a vida financeira.',
    'Aplicação para organizar gastos pessoais, acompanhar movimentações e ter mais controle sobre a vida financeira.',
    null,
    'https://cgasto-financeiro.vercel.app/index.html',
    null,
    array['HTML5', 'CSS3', 'JavaScript'],
    'Projetos',
    'completed',
    true,
    true,
    9
  )
on conflict (slug) do nothing;
