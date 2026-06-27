import { createSupabaseBrowserClient } from "./supabase.js";

const supabase = createSupabaseBrowserClient();
const PAGE_SIZE = 24;

const elements = {
  catalogStatus: document.querySelector("#catalog-status"),
  emptyState: document.querySelector("#empty-state"),
  featuredCarousel: document.querySelector("#featured-carousel"),
  featuredNext: document.querySelector("#featured-next"),
  featuredPrev: document.querySelector("#featured-prev"),
  genreFilters: document.querySelector("#genre-filters"),
  heroMeta: document.querySelector("#hero-meta"),
  heroPoster: document.querySelector("#hero-poster"),
  heroTitle: document.querySelector("#hero-title"),
  loadMore: document.querySelector("#load-more"),
  moviesGrid: document.querySelector("#movies-grid"),
  newReleasesGrid: document.querySelector("#new-releases-grid"),
  openSearch: document.querySelector("#open-search"),
  resultCount: document.querySelector("#result-count"),
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#search-input"),
};

const state = {
  catalogo: [],
  consulta: "",
  generoActivo: "Todos",
  page: 1,
  total: 0,
  hasMore: false,
  latestGenres: [],
};

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

function posterUrl(movie) {
  return movie.imagen || "assets/img/poster-placeholder.svg";
}

function movieUrl(movie) {
  return `movie.html?id=${encodeURIComponent(movie.id)}`;
}

function createMovieCard(movie, { featured = false } = {}) {
  const duracion = movie.duracion ? `<br><span class="movie-runtime">${movie.duracion} min</span>` : "";
  return `
    <article class="movie-card${featured ? " featured-card" : ""}">
      <a href="${movieUrl(movie)}" aria-label="Ver ${escapeHtml(movie.titulo)}">
        <div class="poster">
          <img class="poster-image" src="${posterUrl(movie)}" alt="Portada de ${escapeHtml(movie.titulo)}" loading="lazy" />
          <span class="play-badge">${featured ? "Destacada" : "Ver"}</span>
        </div>
        <div class="movie-card-body">
          <p class="movie-genre">${escapeHtml(movie.genero)}</p>
          <h3>${escapeHtml(movie.titulo)}</h3>
          <p class="movie-meta">${escapeHtml(movie["año"])}${duracion}</p>
          <p class="movie-synopsis">${escapeHtml(movie.sinopsis)}</p>
        </div>
      </a>
    </article>
  `;
}

async function queryMovies({ count = false, offset = 0, limit = PAGE_SIZE } = {}) {
  let query = supabase.from("peliculas").select("*", count ? { count: "exact" } : undefined);

  if (state.generoActivo !== "Todos") {
    query = query.eq("genero", state.generoActivo);
  }

  if (state.consulta) {
    query = query.ilike("titulo", `%${state.consulta}%`);
  }

  const { data, error, count: totalCount } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return {
    data: data ?? [],
    total: totalCount ?? 0,
  };
}

async function loadGenres() {
  const { data, error } = await supabase.from("peliculas").select("genero");
  if (error) throw error;

  const uniqueGenres = ["Todos", ...new Set((data ?? []).map((item) => item.genero).filter(Boolean))];
  uniqueGenres.sort((left, right) => {
    if (left === "Todos") return -1;
    if (right === "Todos") return 1;
    return left.localeCompare(right, "es");
  });

  state.latestGenres = uniqueGenres;
}

async function loadHighlights() {
  const { data, error } = await supabase
    .from("peliculas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;

  const featuredMovies = data ?? [];
  const heroMovie = featuredMovies[0] || null;

  if (heroMovie) {
    elements.heroPoster.src = posterUrl(heroMovie);
    elements.heroPoster.alt = `Portada de ${heroMovie.titulo}`;
    elements.heroTitle.textContent = heroMovie.titulo;
    elements.heroMeta.textContent = `${heroMovie.genero} | ${heroMovie["año"]}`;
  }

  elements.featuredCarousel.innerHTML = featuredMovies.map((movie) => createMovieCard(movie, { featured: true })).join("");

  const newReleases = featuredMovies.slice(0, 6);
  elements.newReleasesGrid.innerHTML = newReleases.map((movie) => createMovieCard(movie)).join("");
}

function renderGenres() {
  elements.genreFilters.innerHTML = state.latestGenres
    .map(
      (genre) => `
        <button class="genre-button${genre === state.generoActivo ? " is-active" : ""}" type="button" data-genre="${escapeHtml(genre)}">
          ${escapeHtml(genre)}
        </button>
      `,
    )
    .join("");
}

function renderCatalog() {
  elements.moviesGrid.innerHTML = state.catalogo.map((movie) => createMovieCard(movie)).join("");
  elements.resultCount.textContent = `${Math.min(state.page * PAGE_SIZE, state.total || state.catalogo.length)} de ${state.total} películas`;
  elements.emptyState.hidden = state.catalogo.length > 0;
  elements.loadMore.hidden = !state.hasMore;
  elements.catalogStatus.textContent = state.total ? `${state.total} películas encontradas` : "Sin resultados";
}

async function loadCatalog({ reset = false } = {}) {
  if (reset) {
    state.page = 1;
    state.catalogo = [];
  }

  const offset = (state.page - 1) * PAGE_SIZE;
  const { data, total } = await queryMovies({ count: true, offset, limit: PAGE_SIZE });

  if (reset) {
    state.catalogo = data;
  } else {
    state.catalogo = [...state.catalogo, ...data];
  }

  state.total = total;
  state.hasMore = offset + data.length < total;
}

async function refreshAll({ resetCatalog = true } = {}) {
  elements.catalogStatus.textContent = "Cargando...";
  await loadGenres();
  await loadHighlights();
  await loadCatalog({ reset: resetCatalog });
  renderGenres();
  renderCatalog();
}

function bindEvents() {
  elements.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.consulta = elements.searchInput.value.trim().toLowerCase();
    await refreshAll({ resetCatalog: true });
    document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  let typingTimer = null;
  elements.searchInput.addEventListener("input", () => {
    clearTimeout(typingTimer);
    typingTimer = window.setTimeout(async () => {
      state.consulta = elements.searchInput.value.trim().toLowerCase();
      await refreshAll({ resetCatalog: true });
    }, 200);
  });

  elements.genreFilters.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-genre]");
    if (!button) return;
    state.generoActivo = button.dataset.genre;
    await refreshAll({ resetCatalog: true });
  });

  elements.loadMore.addEventListener("click", async () => {
    if (!state.hasMore) return;
    state.page += 1;
    const offset = (state.page - 1) * PAGE_SIZE;
    const { data, total } = await queryMovies({ count: true, offset, limit: PAGE_SIZE });
    state.total = total;
    state.catalogo = [...state.catalogo, ...data];
    state.hasMore = offset + data.length < total;
    renderCatalog();
  });

  elements.openSearch.addEventListener("click", () => {
    elements.searchInput.focus();
    document.querySelector(".catalog-tools").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const scrollFeatured = (direction) => {
    const distance = elements.featuredCarousel.clientWidth * 0.85;
    elements.featuredCarousel.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  elements.featuredPrev.addEventListener("click", () => scrollFeatured(-1));
  elements.featuredNext.addEventListener("click", () => scrollFeatured(1));
}

async function init() {
  try {
    bindEvents();
    await refreshAll({ resetCatalog: true });

    supabase
      .channel("peliculas-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "peliculas" }, async () => {
        await refreshAll({ resetCatalog: true });
      })
      .subscribe();
  } catch (error) {
    console.error(error);
    elements.catalogStatus.textContent = "No se pudo cargar el catálogo desde Supabase.";
    elements.emptyState.hidden = false;
    elements.emptyState.textContent = "Revisa la conexión con Supabase y vuelve a intentar.";
  }
}

init();
