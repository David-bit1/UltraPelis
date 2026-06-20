const elements = {
  featuredCarousel: document.querySelector("#featured-carousel"),
  featuredNext: document.querySelector("#featured-next"),
  featuredPrev: document.querySelector("#featured-prev"),
  emptyState: document.querySelector("#empty-state"),
  genreFilters: document.querySelector("#genre-filters"),
  heroMeta: document.querySelector("#hero-meta"),
  heroPoster: document.querySelector("#hero-poster"),
  heroTitle: document.querySelector("#hero-title"),
  moviesGrid: document.querySelector("#movies-grid"),
  newReleasesGrid: document.querySelector("#new-releases-grid"),
  resultCount: document.querySelector("#result-count"),
  catalogStatus: document.querySelector("#catalog-status"),
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#search-input"),
  openSearch: document.querySelector("#open-search"),
};

const state = {
  catalogo: [],
  generoActivo: "Todos",
  consulta: "",
};

const posterFallback = "assets/img/poster-placeholder.svg";

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

function movieUrl(movie) {
  return `movie.html?id=${encodeURIComponent(movie.id)}`;
}

function posterUrl(movie) {
  return movie.imagen || posterFallback;
}

function prepareMovie(movie) {
  return {
    ...movie,
    _año: Number(movie["año"]) || 0,
    _search: normalizeText(movie.titulo),
  };
}

function createCard(movie, { featured = false } = {}) {
  const synopsis = escapeHtml(movie.sinopsis);
  const title = escapeHtml(movie.titulo);
  const genre = escapeHtml(movie.genero);
  const year = escapeHtml(movie["año"]);
  return `
    <article class="movie-card${featured ? " featured-card" : ""}">
      <a href="${movieUrl(movie)}" aria-label="Ver ${title}">
        <div class="poster">
          <img class="poster-image" src="${posterUrl(movie)}" alt="Portada de ${title}" loading="lazy" />
          ${featured ? '<span class="play-badge">Destacada</span>' : '<span class="play-badge">Ver</span>'}
        </div>
        <div class="movie-card-body">
          <p class="movie-genre">${genre}</p>
          <h3>${title}</h3>
          <p class="movie-meta">${year}</p>
          <p class="movie-synopsis">${synopsis}</p>
        </div>
      </a>
    </article>
  `;
}

function updateHero(movie) {
  if (!movie) return;
  elements.heroPoster.src = posterUrl(movie);
  elements.heroPoster.alt = `Portada de ${movie.titulo}`;
  elements.heroTitle.textContent = movie.titulo;
  elements.heroMeta.textContent = `${movie.genero} | ${movie["año"]}`;
}

function renderGenreFilters() {
  const genres = ["Todos", ...new Set(state.catalogo.map((movie) => movie.genero))];
  elements.genreFilters.innerHTML = genres
    .map(
      (genre) => `
        <button
          class="genre-button${genre === state.generoActivo ? " is-active" : ""}"
          type="button"
          data-genre="${escapeHtml(genre)}"
        >
          ${escapeHtml(genre)}
        </button>
      `,
    )
    .join("");
}

function getFilteredMovies() {
  const query = normalizeText(state.consulta);
  return state.catalogo.filter((movie) => {
    const matchesGenre = state.generoActivo === "Todos" || movie.genero === state.generoActivo;
    const matchesQuery = movie._search.includes(query);
    return matchesGenre && matchesQuery;
  });
}

function renderFeatured() {
  const featuredMovies = state.catalogo.filter((movie) => movie.destacada).slice(0, 8);
  elements.featuredCarousel.innerHTML = featuredMovies.map((movie) => createCard(movie, { featured: true })).join("");
}

function renderNewReleases() {
  const latestMovies = [...state.catalogo]
    .sort((left, right) => right._año - left._año || left.titulo.localeCompare(right.titulo))
    .slice(0, 6);
  elements.newReleasesGrid.innerHTML = latestMovies.map((movie) => createCard(movie)).join("");
}

function renderCatalog() {
  const movies = getFilteredMovies();
  elements.moviesGrid.innerHTML = movies.map((movie) => createCard(movie)).join("");
  elements.resultCount.textContent = `${movies.length} resultado${movies.length === 1 ? "" : "s"}`;
  elements.emptyState.hidden = movies.length > 0;
  elements.catalogStatus.textContent = `${state.catalogo.length} peliculas cargadas`;
}

function renderAll() {
  renderGenreFilters();
  renderFeatured();
  renderNewReleases();
  renderCatalog();
  updateHero(state.catalogo.find((movie) => movie.destacada) || state.catalogo[0]);
}

async function loadCatalog() {
  const response = await fetch("data/peliculas.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("No se pudo cargar data/peliculas.json");
  }
  const catalogo = await response.json();
  state.catalogo = catalogo.map(prepareMovie);
}

function bindEvents() {
  elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.consulta = elements.searchInput.value.trim();
    renderCatalog();
    document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  let searchTimer = null;
  elements.searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.consulta = elements.searchInput.value.trim();
      renderCatalog();
    }, 120);
  });

  elements.genreFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-genre]");
    if (!button) return;
    state.generoActivo = button.dataset.genre;
    renderGenreFilters();
    renderCatalog();
  });

  elements.openSearch.addEventListener("click", () => {
    elements.searchInput.focus();
    document.querySelector(".catalog-tools").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const scrollFeatured = (direction) => {
    const distance = elements.featuredCarousel.clientWidth * 0.85;
    elements.featuredCarousel.scrollBy({
      left: direction * distance,
      behavior: "smooth",
    });
  };

  elements.featuredPrev.addEventListener("click", () => scrollFeatured(-1));
  elements.featuredNext.addEventListener("click", () => scrollFeatured(1));

  elements.featuredCarousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      scrollFeatured(-1);
    }
    if (event.key === "ArrowRight") {
      scrollFeatured(1);
    }
  });
}

async function init() {
  try {
    await loadCatalog();
    bindEvents();
    renderAll();
  } catch (error) {
    elements.catalogStatus.textContent = "No se pudo cargar el catalogo.";
    elements.moviesGrid.innerHTML = "";
    elements.newReleasesGrid.innerHTML = "";
    elements.featuredCarousel.innerHTML = "";
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "No fue posible cargar las peliculas.";
    console.error(error);
  }
}

init();
