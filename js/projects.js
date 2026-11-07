import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const PREVIEW_FALLBACKS_URL = './data/preview-fallbacks.json';
const PROJECTS_FALLBACK_URL = './data/projects-fallback.json';
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #060d1a 0%, #0a1f35 100%)';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function hostnameFromUrl(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function loadPreviewMap() {
  try {
    const response = await fetch(PREVIEW_FALLBACKS_URL, { cache: 'no-store' });
    if (!response.ok) return new Map();
    const payload = await response.json();
    return new Map((payload.previews || []).map((item) => [item.slug, item]));
  } catch {
    return new Map();
  }
}

async function fetchPublishedFromSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_PROJECT')) {
    throw new Error('Supabase config missing');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from('projects')
    .select(
      'id,title,slug,short_description,description,image_url,project_url,github_url,technologies,category,status,featured,published,sort_order,created_at,updated_at',
    )
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Empty published projects list');
  }
  return data;
}

async function fetchFallbackProjects() {
  const response = await fetch(PROJECTS_FALLBACK_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Fallback HTTP ${response.status}`);
  const payload = await response.json();
  const projects = payload.projects;
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('Empty fallback snapshot');
  }
  return projects;
}

function renderVisual(project, preview) {
  if (project.image_url) {
    return `
      <div class="card-preview has-cover">
        <img src="${escapeAttr(project.image_url)}" alt="" loading="lazy">
      </div>
      <div class="card-overlay">
        ${project.project_url
          ? `<a href="${escapeAttr(project.project_url)}" target="_blank" rel="noopener noreferrer" class="overlay-btn">VER PROJETO →</a>`
          : '<span class="overlay-btn">VER DETALHES</span>'}
      </div>
    `;
  }

  if (preview?.type === 'video' && preview.videoSrc) {
    return `
      <video class="card-preview" style="background: ${escapeAttr(preview.gradient || DEFAULT_GRADIENT)}; object-fit: cover; width: 100%; height: 100%;" controls>
        <source src="${escapeAttr(preview.videoSrc)}" type="video/mp4">
      </video>
      <div class="card-overlay">
        <span class="overlay-btn">${escapeHtml(preview.overlayLabel || 'VER VÍDEO')}</span>
      </div>
    `;
  }

  const gradient = preview?.gradient || DEFAULT_GRADIENT;
  const previewUrl = preview?.previewUrl || hostnameFromUrl(project.project_url);

  return `
    <div class="card-preview" style="background: ${escapeAttr(gradient)};">
      <span class="preview-icon">//</span>
      ${previewUrl ? `<span class="preview-url">${escapeHtml(previewUrl)}</span>` : ''}
    </div>
    <div class="card-overlay">
      ${project.project_url
        ? `<a href="${escapeAttr(project.project_url)}" target="_blank" rel="noopener noreferrer" class="overlay-btn">VER PROJETO →</a>`
        : '<span class="overlay-btn">EM BREVE</span>'}
    </div>
  `;
}

function renderLinks(project, preview) {
  if (preview?.type === 'video' && !project.project_url) {
    return '<span class="link-btn" style="color: var(--c-green); cursor: default;">📹 Projeto em Vídeo</span>';
  }

  const links = [];
  if (project.project_url) {
    links.push(
      `<a href="${escapeAttr(project.project_url)}" target="_blank" rel="noopener noreferrer" class="link-btn">Demo <span>↗</span></a>`,
    );
  }
  if (project.github_url) {
    links.push(
      `<a href="${escapeAttr(project.github_url)}" target="_blank" rel="noopener noreferrer" class="link-btn ghost">GitHub <span>↗</span></a>`,
    );
  }
  return links.join('') || '<span class="link-btn" style="color: var(--c-muted); cursor: default;">Sem link público</span>';
}

function renderCard(project, index, previewMap) {
  const preview = previewMap.get(project.slug);
  const badge = preview?.badge || (project.featured ? 'DESTAQUE' : '');
  const number = String(project.sort_order ?? index + 1).padStart(2, '0');
  const technologies = Array.isArray(project.technologies) ? project.technologies : [];

  return `
    <article class="project-card${project.featured ? ' featured' : ''} reveal visible" data-index="${escapeAttr(number)}" data-slug="${escapeAttr(project.slug)}">
      ${badge ? `<div class="card-badge">${escapeHtml(badge)}</div>` : ''}
      <div class="card-number">${escapeHtml(number)}</div>
      <div class="card-visual">
        ${renderVisual(project, preview)}
      </div>
      <div class="card-info">
        <div class="card-tags">
          ${technologies.map((tech) => `<span class="tag">${escapeHtml(tech)}</span>`).join('')}
        </div>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.short_description)}</p>
        <div class="card-links">
          ${renderLinks(project, preview)}
        </div>
      </div>
    </article>
  `;
}

function observeProjectCards(grid) {
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });

  grid.querySelectorAll('.project-card').forEach((card) => {
    card.classList.add('reveal');
    revealObs.observe(card);
  });
}

async function loadProjects() {
  const grid = document.getElementById('projectGrid');
  if (!grid) return;

  const previewMap = await loadPreviewMap();
  let projects = null;
  let source = '';

  try {
    projects = await fetchPublishedFromSupabase();
    source = 'supabase';
  } catch (supabaseError) {
    console.warn('Supabase projects unavailable, trying fallback JSON.', supabaseError);
    try {
      projects = await fetchFallbackProjects();
      source = 'fallback-json';
    } catch (fallbackError) {
      console.warn('Fallback JSON unavailable; keeping static markup.', fallbackError);
      return;
    }
  }

  if (!projects?.length) return;

  grid.innerHTML = projects
    .map((project, index) => renderCard(project, index, previewMap))
    .join('');
  grid.dataset.source = source;
  observeProjectCards(grid);
}

void loadProjects();
