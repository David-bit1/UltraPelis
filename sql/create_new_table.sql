-- PASO 1: Crear tabla nueva con todos los campos inline
create table public.peliculas_nueva (
  id bigint generated always as identity primary key,
  tmdb_id integer unique,
  titulo text not null,
  titulo_original text,
  año integer,
  fecha_estreno date,
  sinopsis text,
  poster text,
  backdrop text,
  generos text,
  duracion integer,
  clasificacion text,
  idioma_original text,
  pais text,
  estado text default 'activo',
  popularidad numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  servidor1_nombre text,
  servidor1_iframe text,
  servidor1_idioma text default 'es',
  servidor1_subtitulos boolean default false,
  servidor1_idioma_sub text,
  servidor1_calidad text default '720p',
  
  servidor2_nombre text,
  servidor2_iframe text,
  servidor2_idioma text default 'es',
  servidor2_subtitulos boolean default false,
  servidor2_idioma_sub text,
  servidor2_calidad text default '720p',
  
  servidor3_nombre text,
  servidor3_iframe text,
  servidor3_idioma text default 'es',
  servidor3_subtitulos boolean default false,
  servidor3_idioma_sub text,
  servidor3_calidad text default '720p',
  
  servidor4_nombre text,
  servidor4_iframe text,
  servidor4_idioma text default 'es',
  servidor4_subtitulos boolean default false,
  servidor4_idioma_sub text,
  servidor4_calidad text default '720p'
);

-- Habilitar RLS
alter table public.peliculas_nueva enable row level security;

-- Políticas
create policy "Public read" on public.peliculas_nueva for select using (true);
create policy "Auth insert" on public.peliculas_nueva for insert with check (auth.role() = 'authenticated');
create policy "Auth update" on public.peliculas_nueva for update using (auth.role() = 'authenticated');
create policy "Auth delete" on public.peliculas_nueva for delete using (auth.role() = 'authenticated');