# Estructura de UltraPelis

## Carpetas

- `admin/`: contiene la version antigua del panel; la nueva administracion vive en `admin.html`.
- `assets/css/`: contiene los estilos del sitio.
- `assets/js/`: conserva scripts heredados que ya no usa la version con Supabase.
- `assets/img/`: contiene imagenes propias del proyecto.
- `data/`: conserva archivos legados; el catalogo ya no depende de JSON.
- `docs/`: contiene notas y documentacion del proyecto.
- `img/`: carpeta existente con recursos visuales del proyecto.

## Archivos

- `index.html`: pagina principal con peliculas destacadas, buscador y categorias.
- `movie.html`: pagina unica de detalle; carga cualquier pelicula segun su `id`.
- `admin.html`: panel moderno conectado a Supabase para CRUD completo.
- `index.js`: logica de la pagina principal con lectura en tiempo real desde Supabase.
- `movie.js`: logica de la pagina de detalle y reproductor iframe desde Supabase.
- `admin.js`: logica del panel de administracion con CRUD y autenticacion.
- `supabase.js`: crea el cliente de Supabase en el navegador.
- `style.css`: estilos globales, modo oscuro y responsive.
- `assets/img/poster-placeholder.svg`: portada temporal para peliculas sin imagen.
- `README.md`: resumen del proyecto y reglas principales.
