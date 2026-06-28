-- FASE 1: Crear nueva tabla peliculas con servidores inline
create table if not exists public.peliculas_nueva (
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
  
  -- Servidor 1
  servidor1_nombre text,
  servidor1_iframe text,
  servidor1_idioma text default 'es',
  servidor1_subtitulos boolean default false,
  servidor1_idioma_sub text,
  servidor1_calidad text default '720p',
  
  -- Servidor 2
  servidor2_nombre text,
  servidor2_iframe text,
  servidor2_idioma text default 'es',
  servidor2_subtitulos boolean default false,
  servidor2_idioma_sub text,
  servidor2_calidad text default '720p',
  
  -- Servidor 3
  servidor3_nombre text,
  servidor3_iframe text,
  servidor3_idioma text default 'es',
  servidor3_subtitulos boolean default false,
  servidor3_idioma_sub text,
  servidor3_calidad text default '720p',
  
  -- Servidor 4
  servidor4_nombre text,
  servidor4_iframe text,
  servidor4_idioma text default 'es',
  servidor4_subtitulos boolean default false,
  servidor4_idioma_sub text,
  servidor4_calidad text default '720p'
);

-- Migrar datos existentes de peliculas
insert into public.peliculas_nueva (
  id, tmdb_id, titulo, año, genero, sinopsis, imagen, backdrop, duracion, clasificacion, fecha_estreno, created_at,
  poster, generos,
  servidor1_iframe
)
select 
  id, tmdb_id, titulo, año, genero, sinopsis, imagen, backdrop, duracion, clasificacion, fecha_estreno, created_at,
  imagen as poster, generos,
  iframe
from public.peliculas;

-- Migrar servidores existentes a servidores inline (si la tabla existe)
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'servidores') then
    -- Servidor 2
    update public.peliculas_nueva set
      servidor2_nombre = s.nombre,
      servidor2_iframe = s.url,
      servidor2_idioma = s.idioma_audio,
      servidor2_subtitulos = s.subtitulos,
      servidor2_idioma_sub = s.idioma_subtitulos,
      servidor2_calidad = s.calidad
    from public.servidores s
    where s.pelicula_id = peliculas_nueva.id and s.orden = 1;
    
    -- Servidor 3
    update public.peliculas_nueva set
      servidor3_nombre = s.nombre,
      servidor3_iframe = s.url,
      servidor3_idioma = s.idioma_audio,
      servidor3_subtitulos = s.subtitulos,
      servidor3_idioma_sub = s.idioma_subtitulos,
      servidor3_calidad = s.calidad
    from public.servidores s
    where s.pelicula_id = peliculas_nueva.id and s.orden = 2;
    
    -- Servidor 4
    update public.peliculas_nueva set
      servidor4_nombre = s.nombre,
      servidor4_iframe = s.url,
      servidor4_idioma = s.idioma_audio,
      servidor4_subtitulos = s.subtitulos,
      servidor4_idioma_sub = s.idioma_subtitulos,
      servidor4_calidad = s.calidad
    from public.servidores s
    where s.pelicula_id = peliculas_nueva.id and s.orden = 3;
  end if;
end $$;

-- Habilitar RLS
alter table public.peliculas_nueva enable row level security;

-- Políticas (sin IF NOT EXISTS para compatibilidad)
-- Public read
create policy "Public can read peliculas_nueva" on public.peliculas_nueva for select using (true);

-- Authenticated write
create policy "Authenticated can insert peliculas_nueva" on public.peliculas_nueva for insert with check (auth.role() = 'authenticated');
create policy "Authenticated can update peliculas_nueva" on public.peliculas_nueva for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Authenticated can delete peliculas_nueva" on public.peliculas_nueva for delete using (auth.role() = 'authenticated');

-- NOTA: Ejecutar manualmente después de verificar migración exitosa:
-- alter table public.peliculas rename to peliculas_backup;
-- alter table public.peliculas_nueva rename to peliculas;
-- drop table public.servidores;
-- drop table public.peliculas_backup;