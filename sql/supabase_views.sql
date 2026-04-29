-- Supabase schema para persistir vistas reales de peliculas y series.
-- Ejecuta este archivo en el SQL Editor de Supabase.

begin;

create table if not exists public.movie_views (
  slug text primary key,
  views bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.series_views (
  slug text primary key,
  views bigint not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.increment_movie_view(slug_input text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  result_views bigint;
begin
  insert into public.movie_views as mv (slug, views, updated_at)
  values (lower(trim(slug_input)), 1, now())
  on conflict (slug) do update
    set views = mv.views + 1,
        updated_at = now()
  returning views into result_views;

  return coalesce(result_views, 0);
end;
$$;

create or replace function public.increment_series_view(slug_input text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  result_views bigint;
begin
  insert into public.series_views as sv (slug, views, updated_at)
  values (lower(trim(slug_input)), 1, now())
  on conflict (slug) do update
    set views = sv.views + 1,
        updated_at = now()
  returning views into result_views;

  return coalesce(result_views, 0);
end;
$$;

create or replace function public.get_movie_views(slug_input text)
returns table (slug text, views bigint, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select mv.slug, mv.views, mv.updated_at
  from public.movie_views mv
  where mv.slug = lower(trim(slug_input))
  limit 1;
$$;

create or replace function public.get_series_views(slug_input text)
returns table (slug text, views bigint, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select sv.slug, sv.views, sv.updated_at
  from public.series_views sv
  where sv.slug = lower(trim(slug_input))
  limit 1;
$$;

create or replace function public.get_top_movie_views(limit_input integer default 10)
returns table (slug text, views bigint, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select mv.slug, mv.views, mv.updated_at
  from public.movie_views mv
  order by mv.views desc, mv.updated_at desc, mv.slug asc
  limit greatest(coalesce(limit_input, 10), 1);
$$;

create or replace function public.get_top_series_views(limit_input integer default 10)
returns table (slug text, views bigint, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select sv.slug, sv.views, sv.updated_at
  from public.series_views sv
  order by sv.views desc, sv.updated_at desc, sv.slug asc
  limit greatest(coalesce(limit_input, 10), 1);
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.movie_views to anon, authenticated;
grant select, insert, update on public.series_views to anon, authenticated;
grant execute on function public.increment_movie_view(text) to anon, authenticated;
grant execute on function public.increment_series_view(text) to anon, authenticated;
grant execute on function public.get_movie_views(text) to anon, authenticated;
grant execute on function public.get_series_views(text) to anon, authenticated;
grant execute on function public.get_top_movie_views(integer) to anon, authenticated;
grant execute on function public.get_top_series_views(integer) to anon, authenticated;

alter table public.movie_views enable row level security;
alter table public.series_views enable row level security;

drop policy if exists "movie views public read" on public.movie_views;
create policy "movie views public read"
on public.movie_views
for select
to anon, authenticated
using (true);

drop policy if exists "movie views public insert" on public.movie_views;
create policy "movie views public insert"
on public.movie_views
for insert
to anon, authenticated
with check (true);

drop policy if exists "movie views public update" on public.movie_views;
create policy "movie views public update"
on public.movie_views
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "series views public read" on public.series_views;
create policy "series views public read"
on public.series_views
for select
to anon, authenticated
using (true);

drop policy if exists "series views public insert" on public.series_views;
create policy "series views public insert"
on public.series_views
for insert
to anon, authenticated
with check (true);

drop policy if exists "series views public update" on public.series_views;
create policy "series views public update"
on public.series_views
for update
to anon, authenticated
using (true)
with check (true);

commit;
