import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  createSlug,
  getProject,
  listProjects,
  Project,
  ProjectInput,
  ProjectSort,
  ProjectStatus,
  removeProject,
  removeProjectImage,
  saveProject,
  toErrorMessage,
  uploadProjectImage,
  validateProjectInput,
} from './lib/projects';

type Notice = { kind: 'success' | 'error' | 'warning'; message: string };

const statusLabels: Record<ProjectStatus, string> = {
  in_development: 'Em desenvolvimento',
  completed: 'Concluído',
  paused: 'Pausado',
};

function ProjectAdmin({ onSignOut }: { onSignOut: () => void }) {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="brand sidebar-brand" to="/">
          <span className="brand-bracket">[</span>GA
          <span className="brand-bracket">]</span>
          <span className="brand-cursor">_</span>
        </Link>
        <span className="sidebar-caption">GERENCIAMENTO</span>
        <nav className="sidebar-nav" aria-label="Navegação administrativa">
          <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span aria-hidden="true">⌂</span> Dashboard
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span aria-hidden="true">▤</span> Projetos
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <span className="admin-identity">SESSÃO ADMINISTRATIVA</span>
          <button type="button" className="sidebar-signout" onClick={onSignOut}>
            SAIR <span aria-hidden="true">↗</span>
          </button>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <span className="eyebrow">PORTFÓLIO / ADMIN</span>
          <div className="topbar-actions">
            <span className="topbar-status"><i /> CONECTADO</span>
          </div>
        </header>
        {notice && (
          <div className={`notice notice-${notice.kind}`} role="status">
            <span>{notice.message}</span>
            <button type="button" aria-label="Fechar aviso" onClick={() => setNotice(null)}>×</button>
          </div>
        )}
       <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectList onNotice={setNotice} />} />
          <Route path="/projects/new" element={<ProjectForm onNotice={setNotice} />} />
          <Route path="/projects/:id/preview" element={<ProjectPreviewPage />} />
          <Route path="/projects/:id/edit" element={<ProjectForm onNotice={setNotice} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await listProjects());
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const published = projects.filter((project) => project.published).length;
  const inDevelopment = projects.filter((project) => project.status === 'in_development').length;
  const featured = projects.filter((project) => project.featured).length;

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">VISÃO GERAL</span>
          <h1>Dashboard<span>.</span></h1>
          <p>Resumo dos projetos do seu portfólio.</p>
        </div>
        <Link className="primary-action" to="/projects/new">＋ NOVO PROJETO</Link>
      </div>

      {error && <ErrorPanel message={error} onRetry={() => void load()} />}
      <div className="stats-grid">
        <StatCard label="TOTAL DE PROJETOS" value={loading || error ? '—' : projects.length} icon="▤" />
        <StatCard label="PUBLICADOS" value={loading || error ? '—' : published} icon="↗" tone="green" />
        <StatCard label="RASCUNHOS" value={loading || error ? '—' : projects.length - published} icon="◷" tone="muted" />
        <StatCard label="EM DESENVOLVIMENTO" value={loading || error ? '—' : inDevelopment} icon="⌁" />
        <StatCard label="EM DESTAQUE" value={loading || error ? '—' : featured} icon="✦" tone="green" />
      </div>

      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">ATUALIZADOS RECENTEMENTE</span>
            <h2>Seus projetos</h2>
          </div>
          <Link className="secondary-action" to="/projects">GERENCIAR TODOS →</Link>
        </div>
        {loading ? (
          <LoadingState message="Carregando projetos..." />
        ) : error ? (
          <EmptyState title="Não foi possível carregar" message="Verifique a conexão e tente novamente." />
        ) : projects.length === 0 ? (
          <EmptyState title="Nenhum projeto cadastrado" message="Cadastre seu primeiro projeto para começar a organizar o portfólio." />
        ) : (
          <div className="recent-list">
            {projects.slice(0, 5).map((project) => (
              <ProjectRow key={project.id} project={project} showActions={false} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = 'cyan',
}: {
  label: string;
  value: number | string;
  icon: string;
  tone?: 'cyan' | 'green' | 'muted';
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon tone-${tone}`} aria-hidden="true">{icon}</div>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </article>
  );
}

function ProjectList({ onNotice }: { onNotice: (notice: Notice) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [publication, setPublication] = useState('');
  const [sort, setSort] = useState<ProjectSort>('manual');
  const [deletingId, setDeletingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await listProjects());
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const categories = useMemo(
    () => [...new Set(projects.map((project) => project.category))].sort((a, b) => a.localeCompare(b)),
    [projects],
  );

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    const filtered = projects.filter((project) => (
      (!normalizedQuery || project.title.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
      && (!category || project.category === category)
      && (!status || project.status === status)
      && (!publication || String(project.published) === publication)
    ));
    if (sort === 'newest') {
      return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    if (sort === 'title') {
      return filtered.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    }
    return filtered.sort((a, b) => (
      a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)
    ));
  }, [projects, query, category, status, publication, sort]);

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Excluir "${project.title}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(project.id);
    try {
      await removeProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      try {
        await removeProjectImage(project.image_url);
        onNotice({ kind: 'success', message: `Projeto "${project.title}" excluído.` });
      } catch (cleanupError) {
        onNotice({
          kind: 'warning',
          message: `Projeto excluído, mas a imagem não pôde ser removida: ${toErrorMessage(cleanupError)}`,
        });
      }
    } catch (deleteError) {
      onNotice({ kind: 'error', message: `Não foi possível excluir o projeto: ${toErrorMessage(deleteError)}` });
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONTEÚDO DO PORTFÓLIO</span>
          <h1>Projetos<span>.</span></h1>
          <p>Pesquise, filtre e organize seus projetos publicados e rascunhos.</p>
        </div>
        <Link className="primary-action" to="/projects/new">＋ NOVO PROJETO</Link>
      </div>

      <section className="panel filters-panel" aria-label="Filtros de projetos">
        <label className="filter-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Pesquisar pelo nome..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="filter-control">
          <span className="sr-only">Categoria</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="filter-control">
          <span className="sr-only">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <span className="sr-only">Publicação</span>
          <select value={publication} onChange={(event) => setPublication(event.target.value)}>
            <option value="">Publicados e rascunhos</option>
            <option value="true">Publicados</option>
            <option value="false">Rascunhos</option>
          </select>
        </label>
        <label className="filter-control">
          <span className="sr-only">Ordenação</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as ProjectSort)}>
            <option value="manual">Ordem manual</option>
            <option value="newest">Mais recentes</option>
            <option value="title">Nome (A–Z)</option>
          </select>
        </label>
      </section>

      {error ? (
        <ErrorPanel message={error} onRetry={() => void load()} />
      ) : loading ? (
        <LoadingState message="Carregando projetos..." />
      ) : visibleProjects.length === 0 ? (
        <EmptyState
          title={projects.length ? 'Nenhum resultado encontrado' : 'Nenhum projeto cadastrado'}
          message={projects.length ? 'Altere os filtros e tente novamente.' : 'Cadastre seu primeiro projeto para começar.'}
        />
      ) : (
        <div className="project-admin-list">
          {visibleProjects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              deleting={deletingId === project.id}
              onDelete={() => void handleDelete(project)}
            />
          ))}
        </div>
      )}
      {!loading && !error && projects.length > 0 && (
        <p className="result-count">{visibleProjects.length} de {projects.length} projeto(s)</p>
      )}
    </section>
  );
}

function ProjectRow({
  project,
  deleting = false,
  onDelete,
  showActions = true,
}: {
  project: Project;
  deleting?: boolean;
  onDelete?: () => void;
  showActions?: boolean;
}) {
  return (
    <article className="project-row">
      <ProjectThumbnail project={project} />
      <div className="project-row-main">
        <div className="project-row-title">
          <h3>{project.title}</h3>
          {project.featured && <span className="featured-pill">✦ DESTAQUE</span>}
        </div>
        <p>{project.short_description}</p>
        <div className="project-row-meta">
          <span>{project.category}</span>
          <span className={`status-pill status-${project.status}`}>{statusLabels[project.status]}</span>
          <span className={project.published ? 'publication published' : 'publication draft'}>
            {project.published ? 'PUBLICADO' : 'RASCUNHO'}
          </span>
        </div>
      </div>
      {showActions && (
        <div className="project-row-actions">
          <Link className="icon-action" to={`/projects/${project.id}/edit`} aria-label={`Editar ${project.title}`} title="Editar">✎</Link>
          <Link className="icon-action" to={`/projects/${project.id}/preview`} aria-label={`Pré-visualizar ${project.title}`} title="Pré-visualizar">◉</Link>
          <button
            className="icon-action danger-action"
            type="button"
            disabled={deleting}
            onClick={onDelete}
            aria-label={`Excluir ${project.title}`}
            title="Excluir"
          >
            {deleting ? '…' : '⌫'}
          </button>
        </div>
      )}
    </article>
  );
}

function ProjectThumbnail({ project }: { project: Project }) {
  return (
    <div className={`project-thumbnail${project.image_url ? ' has-image' : ''}`}>
      {project.image_url ? (
        <img src={project.image_url} alt="" loading="lazy" />
      ) : (
        <div className="stylized-preview">
          <span>//</span>
          <small>{project.category}</small>
        </div>
      )}
    </div>
  );
}

type ProjectDraft = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  image_url: string;
  project_url: string;
  github_url: string;
  technologies: string;
  category: string;
  status: ProjectStatus;
  featured: boolean;
  published: boolean;
  sort_order: string;
};

const emptyDraft: ProjectDraft = {
  title: '',
  slug: '',
  short_description: '',
  description: '',
  image_url: '',
  project_url: '',
  github_url: '',
  technologies: '',
  category: '',
  status: 'in_development',
  featured: false,
  published: false,
  sort_order: '0',
};

function ProjectForm({ onNotice }: { onNotice: (notice: Notice) => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft);
  const [original, setOriginal] = useState<Project | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void getProject(id)
      .then((project) => {
        if (!active) return;
        setOriginal(project);
        setDraft({
          title: project.title,
          slug: project.slug,
          short_description: project.short_description,
          description: project.description,
          image_url: project.image_url ?? '',
          project_url: project.project_url ?? '',
          github_url: project.github_url ?? '',
          technologies: project.technologies.join(', '),
          category: project.category,
          status: project.status,
          featured: project.featured,
          published: project.published,
          sort_order: String(project.sort_order),
        });
        setSlugTouched(true);
      })
      .catch((loadError: unknown) => {
        if (active) setError(`Não foi possível carregar o projeto: ${toErrorMessage(loadError)}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const update = <Key extends keyof ProjectDraft>(key: Key, value: ProjectDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleImageChange = (file: File | undefined) => {
    setError('');
    if (!file) return;
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!acceptedTypes.includes(file.type)) {
      setError('Use uma imagem JPEG, PNG, WebP ou AVIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5 MiB.');
      return;
    }
    setImageFile(file);
    setRemoveCurrentImage(false);
  };

  const buildInput = (): ProjectInput => ({
    title: draft.title.trim(),
    slug: draft.slug.trim(),
    short_description: draft.short_description.trim(),
    description: draft.description.trim(),
    image_url: removeCurrentImage ? null : draft.image_url.trim() || null,
    project_url: draft.project_url.trim() || null,
    github_url: draft.github_url.trim() || null,
    technologies: draft.technologies
      .split(',')
      .map((technology) => technology.trim())
      .filter(Boolean),
    category: draft.category.trim(),
    status: draft.status,
    featured: draft.featured,
    published: draft.published,
    sort_order: Number(draft.sort_order),
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const input = buildInput();
    const validationError = validateProjectInput(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!Number.isInteger(input.sort_order) || input.sort_order < 0) {
      setError('A ordem deve ser um número inteiro igual ou maior que zero.');
      return;
    }

    setSaving(true);
    let uploadedImageUrl: string | null = null;
    try {
      if (imageFile) {
        uploadedImageUrl = await uploadProjectImage(imageFile);
        input.image_url = uploadedImageUrl;
      }
      const saved = await saveProject(input, id);
      let cleanupWarning = '';
      if (original?.image_url && original.image_url !== saved.image_url) {
        try {
          await removeProjectImage(original.image_url);
        } catch (cleanupError) {
          cleanupWarning = ` A imagem anterior não foi removida: ${toErrorMessage(cleanupError)}`;
        }
      }
      onNotice({
        kind: cleanupWarning ? 'warning' : 'success',
        message: `${saved.published ? 'Projeto publicado' : 'Rascunho salvo'} com sucesso.${cleanupWarning}`,
      });
      navigate('/projects');
    } catch (saveError) {
      let message = toErrorMessage(saveError);
      if (uploadedImageUrl) {
        try {
          await removeProjectImage(uploadedImageUrl);
        } catch (cleanupError) {
          message += ` Também não foi possível limpar a imagem enviada: ${toErrorMessage(cleanupError)}`;
        }
      }
      setError(`Não foi possível salvar o projeto: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const previewProject: Project = {
    id: original?.id ?? 'preview',
    title: draft.title || 'Nome do projeto',
    slug: draft.slug || 'projeto',
    short_description: draft.short_description || 'A descrição resumida aparecerá nesta prévia.',
    description: draft.description || 'A descrição completa aparecerá nesta prévia.',
    image_url: imagePreview || (removeCurrentImage ? null : draft.image_url || null),
    project_url: draft.project_url || null,
    github_url: draft.github_url || null,
    technologies: draft.technologies.split(',').map((item) => item.trim()).filter(Boolean),
    category: draft.category || 'Categoria',
    status: draft.status,
    featured: draft.featured,
    published: draft.published,
    sort_order: Number(draft.sort_order) || 0,
    created_at: original?.created_at ?? new Date().toISOString(),
    updated_at: original?.updated_at ?? new Date().toISOString(),
  };

  if (loading) return <LoadingState message="Carregando projeto..." />;

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{id ? 'ATUALIZAR REGISTRO' : 'NOVO REGISTRO'}</span>
          <h1>{id ? 'Editar projeto' : 'Cadastrar projeto'}<span>.</span></h1>
          <p>Preencha os dados que serão usados na apresentação do portfólio.</p>
        </div>
        <Link className="secondary-action" to="/projects">← VOLTAR AOS PROJETOS</Link>
      </div>

      {error && <ErrorPanel message={error} />}

      <form className="project-form panel" onSubmit={(event) => void handleSubmit(event)}>
        <fieldset disabled={saving}>
          <legend>INFORMAÇÕES DO PROJETO</legend>
          <div className="form-grid">
            <FormField label="Nome do projeto" required>
              <input
                autoFocus
                maxLength={120}
                value={draft.title}
                onChange={(event) => {
                  const title = event.target.value;
                  update('title', title);
                  if (!slugTouched) update('slug', createSlug(title));
                }}
                placeholder="Ex.: Meu projeto"
              />
            </FormField>
            <FormField label="Slug" hint="Identificador único, usado em URLs.">
              <input
                required
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={draft.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  update('slug', createSlug(event.target.value));
                }}
                placeholder="meu-projeto"
              />
            </FormField>
            <FormField label="Categoria" required>
              <input
                required
                maxLength={80}
                value={draft.category}
                onChange={(event) => update('category', event.target.value)}
                placeholder="Ex.: Aplicação web"
              />
            </FormField>
            <FormField label="Status do desenvolvimento" required>
              <select
                value={draft.status}
                onChange={(event) => update('status', event.target.value as ProjectStatus)}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Descrição resumida" hint="Use uma frase curta para o card." required full>
              <textarea
                required
                maxLength={300}
                rows={2}
                value={draft.short_description}
                onChange={(event) => update('short_description', event.target.value)}
              />
            </FormField>
            <FormField label="Descrição completa" required full>
              <textarea
                required
                maxLength={5000}
                rows={5}
                value={draft.description}
                onChange={(event) => update('description', event.target.value)}
              />
            </FormField>
            <FormField label="URL do projeto" hint="Opcional; deve começar com https:// ou http://">
              <input
                type="url"
                value={draft.project_url}
                onChange={(event) => update('project_url', event.target.value)}
                placeholder="https://"
              />
            </FormField>
            <FormField label="URL do repositório GitHub" hint="Opcional">
              <input
                type="url"
                value={draft.github_url}
                onChange={(event) => update('github_url', event.target.value)}
                placeholder="https://github.com/..."
              />
            </FormField>
            <FormField label="Tecnologias" hint="Separe cada tecnologia por vírgula." full>
              <input
                value={draft.technologies}
                onChange={(event) => update('technologies', event.target.value)}
                placeholder="React, TypeScript, Supabase"
              />
            </FormField>
            <FormField label="Imagem de capa" hint="Opcional. JPEG, PNG, WebP ou AVIF; até 5 MiB." full controlId="project-cover-input">
              <div className="image-upload">
                <input
                  id="project-cover-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(event) => handleImageChange(event.target.files?.[0])}
                />
                {draft.image_url && !imageFile && !removeCurrentImage && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setRemoveCurrentImage(true);
                      update('image_url', '');
                    }}
                  >
                    REMOVER IMAGEM ATUAL
                  </button>
                )}
              </div>
              {!imageFile && !removeCurrentImage && draft.image_url && (
                <input
                  type="url"
                  value={draft.image_url}
                  onChange={(event) => update('image_url', event.target.value)}
                  aria-label="URL da imagem de capa"
                  placeholder="URL da imagem"
                />
              )}
              {imagePreview && <img className="image-preview" src={imagePreview} alt="Prévia da nova imagem de capa" />}
              {!imagePreview && draft.image_url && !removeCurrentImage && (
                <img className="image-preview" src={draft.image_url} alt="Prévia da imagem de capa atual" />
              )}
              {removeCurrentImage && <span className="field-hint">A prévia estilizada será usada sem imagem.</span>}
            </FormField>
            <FormField label="Ordem de exibição" hint="Menor número aparece primeiro.">
              <input
                type="number"
                min={0}
                step={1}
                value={draft.sort_order}
                onChange={(event) => update('sort_order', event.target.value)}
              />
            </FormField>
            {original && (
              <FormField label="Data de criação" hint="Gerada automaticamente pelo banco.">
                <input type="text" readOnly value={new Date(original.created_at).toLocaleDateString('pt-BR')} />
              </FormField>
            )}
          </div>
        </fieldset>

        <fieldset className="form-options" disabled={saving}>
          <legend>PUBLICAÇÃO</legend>
          <label className="check-option">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(event) => update('featured', event.target.checked)}
            />
            <span><strong>Destacar projeto</strong><small>Aplica o destaque visual no card público.</small></span>
          </label>
          <label className="check-option">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(event) => update('published', event.target.checked)}
            />
            <span><strong>Publicar no portfólio</strong><small>Desmarcado, o projeto fica visível apenas no painel.</small></span>
          </label>
        </fieldset>

        <div className="form-actions">
          <button type="button" className="secondary-button" disabled={saving} onClick={() => setPreviewOpen(true)}>
            ◉ PRÉ-VISUALIZAR
          </button>
          <Link className="secondary-button" to="/projects">CANCELAR</Link>
          <button className="primary-action" type="submit" disabled={saving}>
            {saving ? 'SALVANDO...' : draft.published ? 'SALVAR E PUBLICAR →' : 'SALVAR RASCUNHO →'}
          </button>
        </div>
      </form>

      {previewOpen && (
        <div className="preview-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPreviewOpen(false);
        }}>
          <section className="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title">
            <div className="preview-dialog-heading">
              <div>
                <span className="eyebrow">PRÉ-VISUALIZAÇÃO</span>
                <h2 id="preview-title">Como ficará o projeto</h2>
              </div>
              <button type="button" className="icon-action" onClick={() => setPreviewOpen(false)} aria-label="Fechar prévia">×</button>
            </div>
            <PublicStylePreview project={previewProject} />
            <button type="button" className="secondary-button preview-close" onClick={() => setPreviewOpen(false)}>
              VOLTAR À EDIÇÃO
            </button>
          </section>
        </div>
      )}
    </section>
  );
}

function PublicStylePreview({ project }: { project: Project }) {
  return (
    <article className={`public-preview-card${project.featured ? ' featured' : ''}`}>
      {project.featured && <span className="public-preview-badge">DESTAQUE</span>}
      <div className="public-preview-visual">
        {project.image_url ? (
          <img src={project.image_url} alt="" />
        ) : (
          <div className="public-preview-fallback">
            <span>//</span>
            <small>{project.category}</small>
          </div>
        )}
        {project.project_url && (
          <span className="public-preview-overlay">VER PROJETO →</span>
        )}
      </div>
      <div className="public-preview-info">
        <div className="preview-tags">
          {project.technologies.map((technology) => <span className="preview-tag" key={technology}>{technology}</span>)}
        </div>
        <h3>{project.title}</h3>
        <p>{project.short_description}</p>
        {project.project_url && <span className="preview-link">Demo ↗</span>}
      </div>
    </article>
  );
}

function ProjectPreviewPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    void getProject(id)
      .then((data) => {
        if (active) setProject(data);
      })
      .catch((loadError: unknown) => {
        if (active) setError(`Não foi possível carregar a prévia: ${toErrorMessage(loadError)}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <LoadingState message="Carregando prévia..." />;
  if (error || !project) {
    return (
      <section className="page-content">
        <div className="page-heading">
          <div><span className="eyebrow">PRÉ-VISUALIZAÇÃO</span><h1>Projeto<span>.</span></h1></div>
          <Link className="secondary-action" to="/projects">← VOLTAR AOS PROJETOS</Link>
        </div>
        <ErrorPanel message={error || 'Projeto não encontrado.'} />
      </section>
    );
  }

  return (
    <section className="page-content preview-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PRÉ-VISUALIZAÇÃO / {project.slug}</span>
          <h1>Projeto<span>.</span></h1>
          <p>Esta é uma prévia do conteúdo que será exibido no portfólio.</p>
        </div>
        <div className="heading-actions">
          <Link className="secondary-action" to="/projects">← VOLTAR</Link>
          <Link className="primary-action" to={`/projects/${project.id}/edit`}>✎ EDITAR</Link>
        </div>
      </div>
      <PublicStylePreview project={project} />
      <section className="panel preview-description">
        <span className="eyebrow">DESCRIÇÃO COMPLETA</span>
        <p>{project.description}</p>
        <div className="preview-detail-links">
          {project.project_url && <a href={project.project_url} target="_blank" rel="noopener noreferrer">ABRIR PROJETO ↗</a>}
          {project.github_url && <a href={project.github_url} target="_blank" rel="noopener noreferrer">REPOSITÓRIO ↗</a>}
        </div>
        {!project.published && <span className="publication draft">ESTE PROJETO ESTÁ COMO RASCUNHO</span>}
      </section>
    </section>
  );
}

function FormField({
  label,
  hint,
  required = false,
  full = false,
  controlId,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  controlId?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  const id = controlId ?? generatedId;
  const control = isValidElement<{ id?: string }>(children)
    && typeof children.type === 'string'
    && ['input', 'textarea', 'select'].includes(children.type)
    ? cloneElement(children, { id })
    : children;

  return (
    <div className={`form-field${full ? ' full' : ''}`}>
      <label className="field-label" htmlFor={id}>{label}{required && <i> *</i>}</label>
      {control}
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return <div className="loading-state"><span className="status-indicator" />{message}</div>;
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">◈</span>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-panel" role="alert">
      <span>{message}</span>
      {onRetry && <button className="text-button" type="button" onClick={onRetry}>TENTAR NOVAMENTE</button>}
    </div>
  );
}

export default ProjectAdmin;
