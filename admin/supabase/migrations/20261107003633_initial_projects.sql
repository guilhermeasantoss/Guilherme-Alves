create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null
    check (length(btrim(short_description)) > 0),
  description text not null check (length(btrim(description)) > 0),
  image_url text,
  project_url text,
  github_url text,
  technologies text[] not null default '{}'
    check (array_position(technologies, '') is null),
  category text not null check (length(btrim(category)) > 0),
  status text not null default 'in_development'
    check (status in ('in_development', 'completed', 'paused')),
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_image_url_format check (
    image_url is null or (
      image_url = btrim(image_url)
      and image_url ~* '^https?://[^[:space:]]+$'
    )
  ),
  constraint projects_project_url_format check (
    project_url is null or (
      project_url = btrim(project_url)
      and project_url ~* '^https?://[^[:space:]]+$'
    )
  ),
  constraint projects_github_url_format check (
    github_url is null or (
      github_url = btrim(github_url)
      and github_url ~* '^https?://[^[:space:]]+$'
    )
  )
);

create index projects_public_listing_idx
  on public.projects (featured desc, sort_order, created_at desc)
  where published = true;

create or replace function public.is_project_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_project_admin() from public;
grant execute on function public.is_project_admin() to anon, authenticated;

create or replace function public.set_projects_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_projects_updated_at() from public;

create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_projects_updated_at();

alter table public.admin_users enable row level security;
alter table public.projects enable row level security;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
grant select on table public.projects to anon, authenticated;
grant insert, update, delete on table public.projects to authenticated;

create policy "Published projects are publicly readable"
on public.projects
for select
to anon, authenticated
using (published or (select public.is_project_admin()));

create policy "Authorized administrators can insert projects"
on public.projects
for insert
to authenticated
with check ((select public.is_project_admin()));

create policy "Authorized administrators can update projects"
on public.projects
for update
to authenticated
using ((select public.is_project_admin()))
with check ((select public.is_project_admin()));

create policy "Authorized administrators can delete projects"
on public.projects
for delete
to authenticated
using ((select public.is_project_admin()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-images',
  'project-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Project images are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'project-images');

create policy "Authorized administrators can upload project images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-images'
  and (select public.is_project_admin())
);

create policy "Authorized administrators can update project images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-images'
  and (select public.is_project_admin())
)
with check (
  bucket_id = 'project-images'
  and (select public.is_project_admin())
);

create policy "Authorized administrators can delete project images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-images'
  and (select public.is_project_admin())
);
