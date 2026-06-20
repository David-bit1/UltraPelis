const elements = {
  root: document.querySelector("#movie-root"),
  error: document.querySelector("#movie-error"),
  genre: document.querySelector("#movie-genre"),
  genreLabel: document.querySelector("#movie-genre-label"),
  iframe: document.querySelector("#movie-iframe"),
  poster: document.querySelector("#movie-poster"),
  relatedGrid: document.querySelector("#related-grid"),
  synopsis: document.querySelector("#movie-synopsis"),
  title: document.querySelector("#movie-title"),
  year: document.querySelector("#movie-year"),
};

const posterFallback = "assets/img/poster-placeholder.svg";
let catalogCache = null;

function normalizeText(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getMovieIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return id ? Number(id) : null;
}

function movieUrl(movieId) {
  return `movie.html?id=${encodeURIComponent(movieId)}`;
}

function posterUrl(movie) {
  return movie.imagen || posterFallback;
}

async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const response = await fetch("data/peliculas.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("No se pudo cargar data/peliculas.json");
  }
  catalogCache = await response.json();
  return catalogCache;
}

function createRelatedCard(movie) {
  return `
    <article class="related-card">
      <a href="${movieUrl(movie.id)}" aria-label="Ver ${escapeHtml(movie.titulo)}">
        <img src="${posterUrl(movie)}" alt="Portada de ${escapeHtml(movie.titulo)}" loading="lazy" />
        <div class="related-card-body">
          <h3>${escapeHtml(movie.titulo)}</h3>
          <p>${escapeHtml(movie.genero)} · ${escapeHtml(movie["año"])}</p>
        </div>
      </a>
    </article>
  `;
}

function renderError(message) {
  elements.root.hidden = true;
  elements.error.hidden = false;
  elements.error.querySelector("h1").textContent = "Pelicula no encontrada";
  elements.error.querySelector("p").textContent = message;
  document.title = "Pelicula no encontrada | UltraPelis";
}

function renderMovie(movie, catalogo) {
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

  const relatedMovies = catalogo
    .filter((item) => item.id !== movie.id && normalizeText(item.genero) === normalizeText(movie.genero))
    .slice(0, 6);

  if (!relatedMovies.length) {
    elements.relatedGrid.innerHTML = '<p class="empty-state">No hay peliculas relacionadas todavia.</p>';
    return;
  }

  elements.relatedGrid.innerHTML = relatedMovies.map(createRelatedCard).join("");
}

async function initMoviePage() {
  try {
    const catalogo = await loadCatalog();
    const movieId = getMovieIdFromUrl();

    if (!movieId && movieId !== 0) {
      renderError("Falta el parametro id en la URL.");
      return;
    }

    const movie = catalogo.find((item) => Number(item.id) === movieId);
    if (!movie) {
      renderError("No existe una pelicula con ese identificador.");
      return;
    }

    renderMovie(movie, catalogo);
  } catch (error) {
    renderError("No pudimos cargar la pelicula en este momento.");
    console.error(error);
  }
}

initMoviePage();
