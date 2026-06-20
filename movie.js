import { createSupabaseBrowserClient } from "./supabase.js";

const supabase = createSupabaseBrowserClient();

const elements = {
  error: document.querySelector("#movie-error"),
  genre: document.querySelector("#movie-genre"),
  genreLabel: document.querySelector("#movie-genre-label"),
  iframe: document.querySelector("#movie-iframe"),
  poster: document.querySelector("#movie-poster"),
  relatedGrid: document.querySelector("#related-grid"),
  root: document.querySelector("#movie-root"),
  synopsis: document.querySelector("#movie-synopsis"),
  title: document.querySelector("#movie-title"),
  year: document.querySelector("#movie-year"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function posterUrl(movie) {
  return movie.imagen || "assets/img/poster-placeholder.svg";
}

function getMovieId() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  return Number.isFinite(id) && id > 0 ? id : null;
}

function renderError(message) {
  elements.root.hidden = true;
  elements.error.hidden = false;
  elements.error.querySelector("h1").textContent = "Pelicula no encontrada";
  elements.error.querySelector("p").textContent = message;
  document.title = "Pelicula no encontrada | UltraPelis";
}

function relatedCard(movie) {
  return `
    <article class="related-card">
      <a href="movie.html?id=${encodeURIComponent(movie.id)}" aria-label="Ver ${escapeHtml(movie.titulo)}">
        <img src="${posterUrl(movie)}" alt="Portada de ${escapeHtml(movie.titulo)}" loading="lazy" />
        <div class="related-card-body">
          <h3>${escapeHtml(movie.titulo)}</h3>
          <p>${escapeHtml(movie.genero)} · ${escapeHtml(movie["año"])}</p>
        </div>
      </a>
    </article>
  `;
}

async function loadMovie() {
  const movieId = getMovieId();
  if (!movieId) {
    renderError("Falta el parámetro id en la URL.");
    return;
  }

  const { data, error } = await supabase
    .from("peliculas")
    .select("*")
    .eq("id", movieId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    renderError("No existe una película con ese identificador.");
    return;
  }

  const movie = data;
  document.title = `${movie.titulo} | UltraPelis`;
  elements.poster.src = posterUrl(movie);
  elements.poster.alt = `Portada de ${movie.titulo}`;
  elements.title.textContent = movie.titulo;
  elements.year.textContent = movie["año"];
  elements.genre.textContent = movie.genero;
  elements.genreLabel.textContent = movie.genero;
  elements.synopsis.textContent = movie.sinopsis;
  elements.iframe.src = movie.iframe;
  elements.iframe.title = `Reproductor de ${movie.titulo}`;

  const { data: relatedMovies, error: relatedError } = await supabase
    .from("peliculas")
    .select("*")
    .eq("genero", movie.genero)
    .neq("id", movie.id)
    .order("created_at", { ascending: false })
    .limit(6);

  if (relatedError) {
    throw relatedError;
  }

  if (!relatedMovies.length) {
    elements.relatedGrid.innerHTML = '<p class="empty-state">No hay películas relacionadas todavía.</p>';
  } else {
    elements.relatedGrid.innerHTML = relatedMovies.map(relatedCard).join("");
  }
}

async function init() {
  try {
    await loadMovie();
  } catch (error) {
    console.error(error);
    renderError("No pudimos cargar la película desde Supabase.");
  }
}

init();
