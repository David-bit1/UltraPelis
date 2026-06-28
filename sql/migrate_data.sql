-- MIGRAR datos de peliculas a peliculas_nueva
insert into public.peliculas_nueva (
  id, tmdb_id, titulo, año, genero, sinopsis, imagen, backdrop, duracion, clasificacion, fecha_estreno, created_at, generos,
  servidor1_nombre, servidor1_iframe
)
select 
  id, tmdb_id, titulo, año, genero, sinopsis, imagen, backdrop, duracion, clasificacion, fecha_estreno, created_at, generos,
  'Servidor 1', iframe
from public.peliculas
where iframe is not null;

-- Migrar servidores existentes (si la tabla existe)
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'servidores') then
    -- Actualizar servidor2
    update public.peliculas_nueva set
      servidor2_nombre = s.nombre,
      servidor2_iframe = s.url,
      servidor2_idioma = s.idioma_audio,
      servidor2_subtitulos = s.subtitulos,
      servidor2_idioma_sub = s.idioma_subtitulos,
      servidor2_calidad = s.calidad
    from public.servidores s
    where s.pelicula_id = peliculas_nueva.id and s.orden = 1;
    
    -- Actualizar servidor3
    update public.peliculas_nueva set
      servidor3_nombre = s.nombre,
      servidor3_iframe = s.url,
      servidor3_idioma = s.idioma_audio,
      servidor3_subtitulos = s.subtitulos,
      servidor3_idioma_sub = s.idioma_subtitulos,
      servidor3_calidad = s.calidad
    from public.servidores s
    where s.pelicula_id = peliculas_nueva.id and s.orden = 2;
    
    -- Actualizar servidor4
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

-- Verificar migración
select id, titulo, servidor1_nombre, servidor1_iframe from public.peliculas_nueva limit 5;