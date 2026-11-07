import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const adminRoot = join(__dirname, '..');
const repoRoot = join(adminRoot, '..');

function loadEnvFile(filePath) {
  try {
    return Object.fromEntries(
      readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const index = line.indexOf('=');
          return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const fileEnv = loadEnvFile(join(adminRoot, '.env.local'));
const url = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL;
const key =
  process.env.VITE_SUPABASE_ANON_KEY
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || fileEnv.VITE_SUPABASE_ANON_KEY
  || fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

const soft = process.argv.includes('--soft');

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or anon/publishable key in admin/.env.local');
  if (soft) {
    console.warn('Keeping the previous public config and projects-fallback.json snapshot.');
    process.exit(0);
  }
  process.exit(1);
}

mkdirSync(join(repoRoot, 'js'), { recursive: true });
mkdirSync(join(repoRoot, 'data'), { recursive: true });

writeFileSync(
  join(repoRoot, 'js', 'config.js'),
  [
    '/** Public Supabase credentials (anon/publishable). Safe for the browser with RLS. */',
    `export const SUPABASE_URL = ${JSON.stringify(url)};`,
    `export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};`,
    '',
  ].join('\n'),
);

writeFileSync(
  join(repoRoot, 'js', 'config.example.js'),
  [
    '/** Copy to config.js and fill with your public Supabase values. */',
    "export const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';",
    "export const SUPABASE_ANON_KEY = 'YOUR_PUBLISHABLE_OR_ANON_KEY';",
    '',
  ].join('\n'),
);

const previewSource = join(adminRoot, 'docs', 'preview-fallbacks.json');
writeFileSync(
  join(repoRoot, 'data', 'preview-fallbacks.json'),
  readFileSync(previewSource, 'utf8').endsWith('\n')
    ? readFileSync(previewSource, 'utf8')
    : `${readFileSync(previewSource, 'utf8')}\n`,
);

const supabase = createClient(url, key);
const { data, error } = await supabase
  .from('projects')
  .select(
    'id,title,slug,short_description,description,image_url,project_url,github_url,technologies,category,status,featured,published,sort_order,created_at,updated_at',
  )
  .eq('published', true)
  .order('sort_order', { ascending: true })
  .order('created_at', { ascending: false });

if (error) {
  console.error(error.message);
  if (soft) {
    console.warn('Keeping the previous projects-fallback.json snapshot.');
    process.exit(0);
  }
  process.exit(1);
}

if (!data?.length) {
  console.error('Refusing to overwrite projects-fallback.json with an empty list.');
  if (soft) {
    console.warn('Keeping the previous projects-fallback.json snapshot.');
    process.exit(0);
  }
  process.exit(1);
}

const snapshot = {
  generated_at: new Date().toISOString(),
  source: 'supabase.projects published',
  projects: data,
};

writeFileSync(
  join(repoRoot, 'data', 'projects-fallback.json'),
  `${JSON.stringify(snapshot, null, 2)}\n`,
);

console.log(
  JSON.stringify({
    ok: true,
    fallbackCount: data.length,
    slugs: data.map((project) => project.slug),
  }),
);
