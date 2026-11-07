import { supabase } from './supabase';

export type ProjectStatus = 'in_development' | 'completed' | 'paused';
export type ProjectSort = 'manual' | 'newest' | 'title';

export type Project = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  image_url: string | null;
  project_url: string | null;
  github_url: string | null;
  technologies: string[];
  category: string;
  status: ProjectStatus;
  featured: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at'>;

function getClient() {
  if (!supabase) {
    throw new Error('O cliente do Supabase não está configurado.');
  }
  return supabase;
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await getClient()
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Project[];
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await getClient()
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Project;
}

export async function saveProject(
  input: ProjectInput,
  id?: string,
): Promise<Project> {
  const query = id
    ? getClient().from('projects').update(input).eq('id', id)
    : getClient().from('projects').insert(input);
  const { data, error } = await query.select('*').single();

  if (error) throw error;
  return data as Project;
}

export async function removeProject(id: string): Promise<void> {
  const { error } = await getClient().from('projects').delete().eq('id', id);
  if (error) throw error;
}

export function getImageObjectPath(imageUrl: string | null): string | null {
  if (!imageUrl || !supabase) return null;

  try {
    const url = new URL(imageUrl);
    const storagePrefix = '/storage/v1/object/public/project-images/';
    if (url.origin !== new URL(import.meta.env.VITE_SUPABASE_URL).origin) {
      return null;
    }

    const index = url.pathname.indexOf(storagePrefix);
    return index === -1
      ? null
      : decodeURIComponent(url.pathname.slice(index + storagePrefix.length));
  } catch {
    return null;
  }
}

export async function uploadProjectImage(file: File): Promise<string> {
  const client = getClient();
  const extension = file.name.split('.').pop()?.toLowerCase() || 'img';
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from('project-images')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;
  return client.storage.from('project-images').getPublicUrl(path).data.publicUrl;
}

export async function removeProjectImage(imageUrl: string | null): Promise<void> {
  const path = getImageObjectPath(imageUrl);
  if (!path) return;

  const { error } = await getClient().storage.from('project-images').remove([path]);
  if (error) throw error;
}

export function toErrorMessage(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export function createSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function validateProjectInput(input: ProjectInput): string | null {
  if (!input.title.trim()) return 'Informe o nome do projeto.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    return 'O slug deve conter apenas letras minúsculas, números e hífens.';
  }
  if (!input.short_description.trim()) return 'Informe a descrição resumida.';
  if (!input.description.trim()) return 'Informe a descrição completa.';
  if (!input.category.trim()) return 'Informe a categoria.';
  if (input.technologies.some((technology) => !technology.trim())) {
    return 'Remova tecnologias vazias da lista.';
  }

  for (const [label, url] of [
    ['URL do projeto', input.project_url],
    ['URL do GitHub', input.github_url],
    ['URL da imagem', input.image_url],
  ] as const) {
    if (!url) continue;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return `${label} deve começar com http:// ou https://.`;
      }
    } catch {
      return `Informe uma ${label.toLowerCase()} válida.`;
    }
  }

  return null;
}
